import os from "node:os"
import { cancel, intro, isCancel, outro, select } from "@clack/prompts"
import fs from "fs-extra"
import pc from "picocolors"
import { getTargetPaths, type Scope, TYPE_DIRS } from "@/utils/paths"
import { codexEntryMatchesType } from "@/utils/platforms/codex"
import { chooseListRemoveScope, type ScopeChoice } from "@/utils/scope-prompt"

interface ScopedSection {
	scope: Scope
	root: string
	paths: Partial<Record<string, string>>
}

async function collectItemsForPlatform(
	platform: string,
	fullPath: string,
	normalizedType: string,
): Promise<string[]> {
	const items: string[] = []
	const entries = await fs.readdir(fullPath, { withFileTypes: true })

	for (const entry of entries) {
		if (platform === "codex") {
			if (await codexEntryMatchesType(fullPath, entry, normalizedType)) {
				items.push(entry.name)
			}
			continue
		}

		if (entry.isDirectory() || (entry.isFile() && entry.name.endsWith(".md"))) {
			items.push(entry.name)
		}
	}

	items.sort()
	return items
}

function displayPath(absolute: string, root: string, scope: Scope): string {
	if (scope === "global") return absolute.replace(os.homedir(), "~")
	const rel = absolute.startsWith(root)
		? `.${absolute.slice(root.length)}`
		: absolute
	return rel
}

async function listLocalForScopes(
	normalizedType: string,
	sections: ScopedSection[],
) {
	console.log(pc.bold(pc.blue(`Installed ${normalizedType}s (Local):`)))
	let foundAny = false

	const platformsByOrder: string[] = []
	for (const section of sections) {
		for (const platform of Object.keys(section.paths)) {
			if (!platformsByOrder.includes(platform)) platformsByOrder.push(platform)
		}
	}

	for (const platform of platformsByOrder) {
		let printedHeader = false
		for (const section of sections) {
			const fullPath = section.paths[platform]
			if (!fullPath) continue
			if (!(await fs.pathExists(fullPath))) continue
			const items = await collectItemsForPlatform(
				platform,
				fullPath,
				normalizedType,
			)
			if (items.length === 0) continue

			foundAny = true
			if (!printedHeader) {
				console.log(pc.cyan(`  ${platform}:`))
				printedHeader = true
			}

			if (sections.length > 1) {
				const scopeLabel = section.scope === "global" ? "Global" : "Project"
				const display = displayPath(fullPath, section.root, section.scope)
				console.log(pc.dim(`    ${scopeLabel} (${display}):`))
				for (const item of items) {
					console.log(`      - ${item}`)
				}
			} else {
				for (const item of items) {
					console.log(`    - ${item}`)
				}
			}
		}
	}

	if (!foundAny) {
		console.log(pc.dim(`  No installed ${normalizedType}s found.`))
	}
	console.log("")
}

function buildSections(
	normalizedType: string,
	scope: ScopeChoice,
	homedir: string,
	projectRoot: string | undefined,
): ScopedSection[] {
	const sections: ScopedSection[] = []
	if (scope === "global" || scope === "both") {
		sections.push({
			scope: "global",
			root: homedir,
			paths: getTargetPaths(normalizedType, "global"),
		})
	}
	if (scope === "project" || scope === "both") {
		if (projectRoot) {
			sections.push({
				scope: "project",
				root: projectRoot,
				paths: getTargetPaths(normalizedType, "project", projectRoot),
			})
		}
	}
	return sections
}

async function performListing(type: string, local: boolean) {
	const normalizedType = type.toLowerCase().endsWith("s")
		? type.slice(0, -1)
		: type.toLowerCase()

	if (local) {
		throw new Error(
			"performListing should not be called for local mode; use listLocalForScopes",
		)
	}

	if (!TYPE_DIRS[normalizedType]) {
		console.error(
			pc.red(`Unknown type: ${type}. Supported types: skill, agent, workflow`),
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

export interface ListOptions {
	local?: boolean
	skipIntro?: boolean
	scope?: ScopeChoice
}

export async function list(type?: string, options?: ListOptions) {
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

			if (isLocal) {
				const scopeChoice = await chooseListRemoveScope({
					action: "list",
					flag: options?.scope,
				})
				if ("rejected" in scopeChoice) {
					cancel(
						`Scope --scope=${options?.scope} unavailable: ${scopeChoice.reason}`,
					)
					process.exit(1)
					return
				}
				if (scopeChoice.cancelled) {
					if (isSingleShot) break
					currentType = undefined
					continue
				}

				for (const t of typesToList) {
					const normalizedType = t.toLowerCase().endsWith("s")
						? t.slice(0, -1)
						: t.toLowerCase()
					const sections = buildSections(
						normalizedType,
						scopeChoice.scope,
						scopeChoice.homedir,
						scopeChoice.projectRoot,
					)
					await listLocalForScopes(normalizedType, sections)
				}
			} else {
				for (const t of typesToList) {
					await performListing(t, false)
				}
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
