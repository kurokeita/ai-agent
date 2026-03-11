import { intro, isCancel, outro, select } from "@clack/prompts"
import fs from "fs-extra"
import pc from "picocolors"
import { getTargetPaths, TYPE_DIRS } from "@/utils/paths"
import { codexEntryMatchesType } from "@/utils/platforms/codex"

async function performListing(type: string, local: boolean) {
	// Handle plural/singular input for convenience
	const normalizedType = type.toLowerCase().endsWith("s")
		? type.slice(0, -1)
		: type.toLowerCase()

	if (local) {
		// List installed items locally
		console.log(pc.bold(pc.blue(`Installed ${normalizedType}s (Local):`)))
		const targetPaths = getTargetPaths(normalizedType)
		let foundAny = false

		for (const [platform, pathStr] of Object.entries(targetPaths)) {
			const fullPath = pathStr as string
			if (await fs.pathExists(fullPath)) {
				const entries = await fs.readdir(fullPath, {
					withFileTypes: true,
				})
				const items: string[] = []

				for (const entry of entries) {
					if (platform === "codex") {
						if (await codexEntryMatchesType(fullPath, entry, normalizedType)) {
							items.push(entry.name)
						}
						continue
					}

					if (
						entry.isDirectory() ||
						(entry.isFile() && entry.name.endsWith(".md"))
					) {
						items.push(entry.name)
					}
				}

				items.sort()

				if (items.length > 0) {
					foundAny = true
					console.log(pc.cyan(`  ${platform}:`))
					for (const item of items) {
						console.log(`    - ${item}`)
					}
				}
			}
		}

		if (!foundAny) {
			console.log(pc.dim(`  No installed ${normalizedType}s found.`))
		}
		console.log("") // Newline for separation
	} else {
		// List available items in repo (existing logic)
		if (!TYPE_DIRS[normalizedType]) {
			console.error(
				pc.red(
					`Unknown type: ${type}. Supported types: skill, agent, workflow`,
				),
			)
			return
		}

		const dirPath = TYPE_DIRS[normalizedType]

		if (!(await fs.pathExists(dirPath))) {
			console.log(
				pc.yellow(`No ${normalizedType} directory found at: ${dirPath}`),
			)
			return
		}

		const entries = await fs.readdir(dirPath, { withFileTypes: true })
		const items = entries
			.filter(
				(entry) =>
					entry.isDirectory() ||
					(normalizedType !== "skill" &&
						entry.isFile() &&
						entry.name.endsWith(".md")),
			)
			.map((entry) => entry.name)
			.sort()

		if (items.length > 0) {
			console.log(pc.bold(pc.blue(`Available ${normalizedType}s:`)))
			for (const item of items) {
				console.log(`- ${item}`)
			}
			console.log(pc.dim(`Total: ${items.length} ${normalizedType}s\n`))
		} else {
			console.log(pc.dim(`No ${normalizedType}s found.`))
		}
	}
}

export async function list(
	type?: string,
	options?: { local?: boolean; skipIntro?: boolean },
) {
	if (!options?.skipIntro) {
		intro(pc.bgCyan(pc.black(" AI Manager : List ")))
	}

	let currentType = type
	let isLocal = !!options?.local
	const isSingleShot = !!type

	try {
		while (true) {
			if (!currentType) {
				const selected = await select({
					message: `What would you like to list? (View: ${isLocal ? "Local" : "Repository"})`,
					options: [
						{ label: "All Skills", value: "skill" },
						{ label: "All Agents", value: "agent" },
						{ label: "All Workflows", value: "workflow" },
						{
							label: `Switch to ${isLocal ? "Repository" : "Local"} View`,
							value: "toggle",
						},
						{ label: "Exit", value: "exit" },
					],
				})

				if (isCancel(selected) || selected === "exit") {
					break
				}

				if (selected === "toggle") {
					isLocal = !isLocal
					continue
				}

				currentType = selected as string
			}

			const typesToList =
				currentType === "all" ? ["skill", "agent", "workflow"] : [currentType]

			for (const t of typesToList) {
				await performListing(t, isLocal)
			}

			if (isSingleShot) break
			currentType = undefined
		}
	} catch (error) {
		console.error(pc.red("Error listing items:"), error)
	}

	if (!options?.skipIntro) {
		outro("Done!")
	}
}
