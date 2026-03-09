import path from "node:path"
import {
	cancel,
	confirm,
	intro,
	isCancel,
	outro,
	select,
	spinner,
	text,
} from "@clack/prompts"
import fs from "fs-extra"
import pc from "picocolors"
import { fetchSkillFromGitHub } from "@/utils/github"
import { TYPE_DIRS } from "@/utils/paths"

export async function importItem(
	type?: string,
	url?: string,
	options?: { skipIntro?: boolean },
) {
	if (!options?.skipIntro) {
		intro(pc.bgCyan(pc.black(" AI Manager : Import ")))
	}

	let currentType = type
	if (!currentType) {
		const selectedType = await select({
			message: "What would you like to import?",
			options: [
				{ label: "Skill", value: "skill" },
				{ label: "Agent", value: "agent" },
				{ label: "Workflow", value: "workflow" },
			],
		})

		if (isCancel(selectedType)) return
		currentType = selectedType as string
	}

	// Normalize type
	const normalizedType = currentType.toLowerCase().endsWith("s")
		? currentType.slice(0, -1)
		: currentType
	const targetBaseDir = TYPE_DIRS[normalizedType]

	if (!targetBaseDir) {
		cancel(`Unknown type: ${currentType}. Supported: skill, agent, workflow`)
		process.exit(1)
		return
	}

	let currentUrl = url
	if (!currentUrl) {
		const inputUrl = await text({
			message: "Enter the GitHub URL:",
			placeholder: "https://github.com/owner/repo/tree/main/path/to/item",
			validate: (value) => {
				if (!value) return "URL is required."
				if (!value.startsWith("https://github.com/"))
					return "Must be a GitHub URL."
			},
		})

		if (isCancel(inputUrl)) return
		currentUrl = inputUrl as string
	}

	let tempDir: string | null = null

	try {
		// 1. Fetch Item (using fetchSkillFromGitHub as generic fetcher)
		const s = spinner()
		s.start(`Fetching ${normalizedType} from GitHub...`)
		let itemName = ""
		let isFile = false

		try {
			const result = await fetchSkillFromGitHub(currentUrl)
			tempDir = result.tempDir
			if (!tempDir) throw new Error("Failed to create temp directory")
			itemName = result.skillName // reuse property or rename if possible. assuming generic repo structure
			isFile = result.isFile
			s.stop(pc.green(`Fetched: ${itemName}`))
		} catch (e) {
			s.stop(pc.red("Failed to fetch"))
			throw e
		}

		// 2. Determine Target
		const shouldFlatten =
			(normalizedType === "agent" || normalizedType === "workflow") && !isFile
		const targetPath = shouldFlatten
			? targetBaseDir
			: path.join(targetBaseDir, itemName)

		// 3. Check Existence & Confirm Overwrite
		if (shouldFlatten) {
			const srcFiles = await fs.readdir(tempDir)
			const conflicts: string[] = []
			for (const file of srcFiles) {
				if (await fs.pathExists(path.join(targetBaseDir, file))) {
					conflicts.push(file)
				}
			}

			if (conflicts.length > 0) {
				const limit = 5
				const displayList = conflicts.slice(0, limit).join(", ")
				const remainder = conflicts.length - limit
				const message =
					remainder > 0
						? `Files ${displayList} (and ${remainder} others) already exist in ${targetBaseDir}. Overwrite?`
						: `Files ${displayList} already exist in ${targetBaseDir}. Overwrite?`

				const shouldOverwrite = await confirm({
					message,
					initialValue: false,
				})

				if (isCancel(shouldOverwrite) || !shouldOverwrite) {
					await fs.remove(tempDir)
					return
				}
			}
		} else if (await fs.pathExists(targetPath)) {
			const shouldOverwrite = await confirm({
				message: `${normalizedType} '${itemName}' already exists in the repo. Overwrite?`,
				initialValue: false,
			})

			if (isCancel(shouldOverwrite) || !shouldOverwrite) {
				await fs.remove(tempDir)
				return
			}
		}

		// 4. Move/Copy to Target Directory
		s.start(`Importing ${itemName} to ${targetBaseDir}...`)
		await fs.ensureDir(targetBaseDir)
		if (isFile) {
			await fs.copy(path.join(tempDir, itemName), targetPath, {
				overwrite: true,
			})
		} else {
			if (shouldFlatten) {
				await fs.copy(tempDir, targetBaseDir, { overwrite: true })
			} else {
				await fs.copy(tempDir, targetPath, { overwrite: true })
			}
		}
		s.stop(pc.green(`Successfully imported ${itemName}!`))

		// Cleanup
		await fs.remove(tempDir)

		if (!options?.skipIntro) {
			outro(`${normalizedType} available at: ${targetPath}`)
		}
	} catch (error) {
		if (tempDir) await fs.remove(tempDir)
		cancel(`An error occurred: ${error}`)
		process.exit(1)
		return
	}
}
