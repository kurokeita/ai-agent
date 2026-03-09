import path from "node:path"
import {
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
import { getTargetPaths, PLATFORM_LABELS, type Platform } from "@/utils/paths"

export async function remove(type?: string, options?: { skipIntro?: boolean }) {
	if (!options?.skipIntro) {
		intro(pc.bgCyan(pc.black(" AI Manager : Remove ")))
	}

	let currentType = type
	const isSingleShot = !!type

	while (true) {
		if (!currentType) {
			const selectedType = await select({
				message: "What would you like to remove?",
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
		const normalizedType = currentType.toLowerCase().endsWith("s")
			? currentType.slice(0, -1)
			: currentType

		const targetPaths = getTargetPaths(normalizedType)

		// 1. Collect unique installed items across all platforms
		const uniqueItems = new Set<string>()
		const s = spinner()
		s.start("Scanning for installed items...")

		for (const pathStr of Object.values(targetPaths)) {
			if (await fs.pathExists(pathStr as string)) {
				const entries = await fs.readdir(pathStr as string, {
					withFileTypes: true,
				})

				for (const entry of entries) {
					if (
						entry.isDirectory() ||
						(normalizedType === "workflow" &&
							entry.isFile() &&
							entry.name.endsWith(".md")) ||
						(normalizedType === "agent" &&
							entry.isFile() &&
							entry.name.endsWith(".md"))
					) {
						uniqueItems.add(entry.name)
					}
				}
			}
		}

		s.stop(`Found ${uniqueItems.size} unique installed ${normalizedType}s.`)

		if (uniqueItems.size === 0) {
			note(`No installed ${normalizedType}s found.`, "Information")
			if (isSingleShot) break
			currentType = undefined
			continue
		}

		// Sort explicitly
		const sortedItems = Array.from(uniqueItems).sort()

		// 2. Select Items
		const itemSelections = await multiselect({
			message: `Select ${normalizedType}s to remove:`,
			options: sortedItems.map((item) => ({ value: item, label: item })),
			required: true,
		})

		if (isCancel(itemSelections)) {
			if (isSingleShot) break
			currentType = undefined
			continue
		}

		const selectedItems = itemSelections as string[]

		// 3. Select Platforms
		// Only show platforms relevant to the type
		const platformOptions = Object.entries(targetPaths)
			.filter(([_, pathStr]) => !!pathStr)
			.map(([platform]) => ({
				label: PLATFORM_LABELS[platform as Platform],
				value: platform,
			}))

		const platformSelections = await multiselect({
			message: "Select platforms to remove from:",
			options: platformOptions,
			required: true,
		})

		if (isCancel(platformSelections)) {
			if (isSingleShot) break
			currentType = undefined
			continue
		}

		const selectedPlatforms = platformSelections as Platform[]

		// 4. Confirmation
		const confirmDelete = await confirm({
			message: `Are you sure you want to remove ${selectedItems.length} item(s) from ${selectedPlatforms.length} platform(s)?`,
			initialValue: false,
		})

		if (isCancel(confirmDelete) || !confirmDelete) {
			if (isSingleShot) break
			currentType = undefined
			continue
		}

		// 5. Deletion Loop
		const sDel = spinner()
		sDel.start("Removing items...")

		let removedCount = 0
		let notFoundCount = 0
		const errors: string[] = []

		for (const platform of selectedPlatforms) {
			const targetBase = targetPaths[platform]
			if (!targetBase) continue

			for (const item of selectedItems) {
				const targetPath = path.join(targetBase, item)

				// Check if exists before trying to remove, to correctly count "removed" vs "not found"
				if (await fs.pathExists(targetPath)) {
					sDel.message(`Removing ${pc.bold(item)} from ${pc.cyan(platform)}...`)
					try {
						await fs.remove(targetPath)
						removedCount++
					} catch (err) {
						const msg = err instanceof Error ? err.message : String(err)
						errors.push(`${item} (${platform}): ${msg}`)
					}
				} else {
					notFoundCount++
				}
			}
		}

		if (errors.length > 0) {
			sDel.stop(
				pc.yellow(
					`Completed with errors. Removed: ${removedCount}, Not Found: ${notFoundCount}, Errors: ${errors.length}`,
				),
			)
			console.error(pc.red("\nErrors encountered:"))
			for (const e of errors) {
				console.error(pc.red(`- ${e}`))
			}
		} else {
			sDel.stop(
				pc.green(
					`Successfully removed ${removedCount} items. (${notFoundCount} not found)`,
				),
			)
		}

		if (isSingleShot) break
		currentType = undefined
	}

	if (!options?.skipIntro) {
		outro("Done!")
	}
}
