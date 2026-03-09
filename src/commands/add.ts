import os from "node:os"
import path from "node:path"

import {
	cancel,
	confirm,
	intro,
	isCancel,
	multiselect,
	note,
	outro,
	select,
	spinner,
} from "@clack/prompts"
import fs from "fs-extra"
import pc from "picocolors"
import { fetchSkillFromGitHub } from "@/utils/github"
import {
	getTargetPaths,
	PLATFORM_LABELS,
	type Platform,
	TYPE_DIRS,
} from "@/utils/paths"
import { getHandler } from "@/utils/platforms"

function getPlatformOptions(type: string) {
	const paths = getTargetPaths(type)
	return Object.entries(paths)
		.filter(([_, pathStr]) => !!pathStr)
		.map(([platform, pathStr]) => ({
			label: PLATFORM_LABELS[platform as Platform],
			value: platform,
			hint: (pathStr as string).replace(os.homedir(), "~"),
		}))
}

async function installItem(
	itemName: string,
	overwrite: boolean,
	sourcePath: string,
	targetBaseDir: string,
): Promise<boolean> {
	const targetPath = path.join(targetBaseDir, itemName)

	if (!(await fs.pathExists(sourcePath))) {
		throw new Error(`Item '${itemName}' not found at ${sourcePath}`)
	}

	if (!overwrite && (await fs.pathExists(targetPath))) {
		return false
	}

	await fs.ensureDir(targetBaseDir)
	await fs.copy(sourcePath, targetPath, { overwrite })
	return true
}

export async function add(
	type?: string,
	url?: string,
	options?: { skipIntro?: boolean },
) {
	if (!options?.skipIntro) {
		intro(pc.bgCyan(pc.black(" AI Manager : Add ")))
	}

	let currentType = type
	const isSingleShot = !!type || !!url

	while (true) {
		if (!currentType && !url) {
			const selectedType = await select({
				message: "What would you like to add?",
				options: [
					{ label: "Skills", value: "skill" },
					{ label: "Agents", value: "agent" },
					{ label: "Workflows", value: "workflow" },
					{ label: "Exit", value: "exit" },
				],
			})

			if (isCancel(selectedType) || selectedType === "exit") {
				break
			}
			currentType = selectedType as string
		}

		// Normalize type
		const normalizedType =
			currentType?.toLowerCase().endsWith("s") && currentType.length > 1
				? currentType.slice(0, -1)
				: (currentType ?? "")

		if (!TYPE_DIRS[normalizedType] && !url) {
			cancel(`Unknown type: ${currentType}. Supported: skill, agent, workflow`)
			process.exit(1)
			return
		}

		let tempDir: string | null = null
		let selectedItems: string[] = []

		try {
			// 1. Determine Source (Local vs GitHub)
			if (url) {
				const s = spinner()
				s.start(`Fetching ${normalizedType} from GitHub...`)
				try {
					const result = await fetchSkillFromGitHub(url)
					tempDir = result.tempDir
					selectedItems = [result.skillName]
					s.stop(pc.green(`Fetched ${normalizedType}: ${result.skillName}`))
				} catch (e) {
					s.stop(pc.red("Failed to fetch"))
					throw e
				}
			} else {
				// Local Selection Logic
				const sourceDir = TYPE_DIRS[normalizedType]
				if (!(await fs.pathExists(sourceDir))) {
					cancel(`${normalizedType} directory not found!`)
					process.exit(1)
					return
				}

				const entries = await fs.readdir(sourceDir, { withFileTypes: true })
				const availableItems = entries
					.filter(
						(entry) =>
							entry.isDirectory() ||
							((normalizedType === "workflow" || normalizedType === "agent") &&
								entry.isFile() &&
								entry.name.endsWith(".md")),
					)
					.map((entry) => ({ label: entry.name, value: entry.name }))
					.sort((a, b) => a.label.localeCompare(b.label))

				if (availableItems.length === 0) {
					note(`No ${normalizedType}s found in directory.`, "Information")
					if (isSingleShot) break
					currentType = undefined
					continue
				}

				// Select Items
				const items = await multiselect({
					message: `Select ${normalizedType}s to install:`,
					options: availableItems,
					required: true,
				})

				if (isCancel(items)) {
					if (isSingleShot) break
					currentType = undefined
					continue
				}
				selectedItems = items as string[]
			}

			// 2. Select Platforms
			// Filter platform options based on support for the type
			const supportedPaths = getTargetPaths(normalizedType)
			const currentPlatformOptions = getPlatformOptions(normalizedType)

			if (currentPlatformOptions.length === 0) {
				cancel(`No supported platforms found for type '${normalizedType}'.`)
				process.exit(1)
				return
			}

			const platforms = await multiselect({
				message: "Select target platforms:",
				options: currentPlatformOptions,
				required: true,
			})

			if (isCancel(platforms)) {
				if (tempDir) await fs.remove(tempDir)
				if (isSingleShot) break
				currentType = undefined
				continue
			}

			const selectedPlatforms = platforms as Platform[]

			// 3. Check for existing items
			const existingItems: { item: string; platform: Platform }[] = []
			for (const platform of selectedPlatforms) {
				const targetBase = supportedPaths[platform]
				if (!targetBase) continue

				for (const item of selectedItems) {
					const targetPath = path.join(targetBase, item)
					if (await fs.pathExists(targetPath)) {
						existingItems.push({ item, platform })
					}
				}
			}

			let overwrite = true
			if (existingItems.length > 0) {
				const limit = 5
				const displayList = existingItems
					.slice(0, limit)
					.map((e) => `${pc.bold(e.item)} (${e.platform})`)
					.join(", ")
				const remainder = existingItems.length - limit
				const message =
					remainder > 0
						? `The following items already exist: ${displayList}, and ${remainder} others.`
						: `The following items already exist: ${displayList}.`

				note(message, "Attention")

				const shouldOverwrite = await confirm({
					message: "Do you want to overwrite existing items?",
					initialValue: false,
				})

				if (isCancel(shouldOverwrite)) {
					if (tempDir) await fs.remove(tempDir)
					if (isSingleShot) break
					currentType = undefined
					continue
				}

				overwrite = shouldOverwrite as boolean
			}

			// 4. Confirmation Note
			note(
				`Installing ${selectedItems.length} ${normalizedType}s to ${selectedPlatforms.length} platforms...`,
				"Summary",
			)

			// 5. Installation Loop with Spinner
			const s = spinner()
			s.start("Installing...")

			const errors: string[] = []
			let installedCount = 0
			let skippedCount = 0

			for (const platform of selectedPlatforms) {
				const targetBase = supportedPaths[platform]
				if (!targetBase) continue

				for (const item of selectedItems) {
					const message = `Installing ${pc.bold(item)} to ${pc.cyan(platform)}...`
					s.message(message)

					try {
						let currentSourcePath: string

						if (url && tempDir) {
							const potentialFile = path.join(tempDir, item)
							if (
								(await fs.pathExists(potentialFile)) &&
								(await fs.stat(potentialFile)).isFile()
							) {
								currentSourcePath = potentialFile
							} else {
								currentSourcePath = tempDir
							}
						} else {
							// Local source
							const src = path.join(TYPE_DIRS[normalizedType], item)
							if ((await fs.stat(src)).isFile()) {
								currentSourcePath = src
							} else {
								currentSourcePath = src // direct path to dir
							}
						}

						const handler = getHandler(platform)
						const targetItemName = handler.getTargetFileName(
							item,
							normalizedType,
						)

						// Platform-specific Agent/Workflow Transformations
						if (
							(normalizedType === "agent" || normalizedType === "workflow") &&
							currentSourcePath.endsWith(".md")
						) {
							const targetPath = path.join(targetBase, targetItemName)

							if (!overwrite && (await fs.pathExists(targetPath))) {
								skippedCount++
							} else {
								let content = await fs.readFile(currentSourcePath, "utf-8")
								content = handler.transform(
									content,
									normalizedType,
									path.parse(item).name,
								)

								await fs.ensureDir(path.dirname(targetPath))
								await fs.writeFile(targetPath, content)
								installedCount++
							}
							continue
						}

						const installed = await installItem(
							targetItemName,
							overwrite,
							currentSourcePath,
							targetBase,
						)
						if (installed) {
							installedCount++
						} else {
							skippedCount++
						}
					} catch (err: unknown) {
						const errorMessage =
							err instanceof Error ? err.message : String(err)
						errors.push(`${item} -> ${platform}: ${errorMessage}`)
					}
				}
			}

			// Cleanup
			if (tempDir) {
				await fs.remove(tempDir)
			}

			if (errors.length > 0) {
				s.stop(
					pc.yellow(
						`Completed with errors. Installed: ${installedCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`,
					),
				)
				console.error(pc.red("\nErrors encountered:"))
				for (const e of errors) {
					console.error(pc.red(`- ${e}`))
				}
			} else {
				s.stop(
					pc.green(
						`Successfully installed ${installedCount} ${normalizedType}s. (${skippedCount} skipped)`,
					),
				)
			}
		} catch (error) {
			if (tempDir) await fs.remove(tempDir)
			cancel(`An error occurred: ${error}`)
			process.exit(1)
			return
		}

		if (isSingleShot) break
		currentType = undefined
	}

	if (!options?.skipIntro) {
		outro("You're all set!")
	}
}
