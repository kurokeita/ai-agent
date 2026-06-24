import path from "node:path"
import {
	autocompleteMultiselect,
	cancel,
	confirm,
	intro,
	isCancel,
	note,
	outro,
	select,
	spinner,
} from "@clack/prompts"
import fs from "fs-extra"
import pc from "picocolors"
import {
	getAgentsBase,
	getProjectPlatformPathsAgents,
	getProjectPlatformPathsSkills,
	getProjectPlatformPathsWorkflows,
	PLATFORM_PATHS_AGENTS,
	PLATFORM_PATHS_SKILLS,
	PLATFORM_PATHS_WORKFLOWS,
	type Platform,
	type Scope,
	TYPE_SUBDIRS,
} from "@/utils/paths"
import { enableAutocompleteMultiSelectShiftAToggle } from "@/utils/prompts"
import { chooseListRemoveScope, type ScopeChoice } from "@/utils/scope-prompt"

enableAutocompleteMultiSelectShiftAToggle()

interface ScopedBase {
	scope: Scope
	base: string
	root: string
}

interface ScannedItem {
	key: string
	label: string
	name: string
	scope: Scope
}

function buildScopedBases(
	scope: ScopeChoice,
	homedir: string,
	projectRoot: string | undefined,
): ScopedBase[] {
	const out: ScopedBase[] = []
	if (scope === "global" || scope === "both") {
		out.push({
			scope: "global",
			base: getAgentsBase("global"),
			root: homedir,
		})
	}
	if ((scope === "project" || scope === "both") && projectRoot) {
		out.push({
			scope: "project",
			base: getAgentsBase("project", projectRoot),
			root: projectRoot,
		})
	}
	return out
}

async function scanInstalledItems(
	scopedBases: ScopedBase[],
	subdir: string,
	normalizedType: string,
): Promise<ScannedItem[]> {
	const seen = new Set<string>()
	const items: ScannedItem[] = []
	const showScopePrefix = scopedBases.length > 1

	for (const { scope, base } of scopedBases) {
		const subdirPath = path.join(base, subdir)
		if (!(await fs.pathExists(subdirPath))) continue

		const entries = await fs.readdir(subdirPath, { withFileTypes: true })
		for (const entry of entries) {
			const qualifies =
				entry.isDirectory() ||
				(normalizedType !== "skill" &&
					entry.isFile() &&
					entry.name.endsWith(".md"))
			if (!qualifies) continue

			const key = showScopePrefix ? `${scope}:${entry.name}` : entry.name
			if (seen.has(key)) continue
			seen.add(key)
			items.push({
				key,
				name: entry.name,
				scope,
				label: showScopePrefix ? `[${scope}] ${entry.name}` : entry.name,
			})
		}
	}

	return items.sort((a, b) => a.label.localeCompare(b.label))
}

function getPlatformDirs(
	scope: Scope,
	root: string,
	normalizedType: string,
): Partial<Record<Platform, string>> {
	if (scope === "project") {
		switch (normalizedType) {
			case "agent":
				return getProjectPlatformPathsAgents(root)
			case "workflow":
				return getProjectPlatformPathsWorkflows(root)
			default:
				return getProjectPlatformPathsSkills(root)
		}
	}
	switch (normalizedType) {
		case "agent":
			return PLATFORM_PATHS_AGENTS
		case "workflow":
			return PLATFORM_PATHS_WORKFLOWS
		default:
			return PLATFORM_PATHS_SKILLS
	}
}

async function pruneDanglingLinks(
	platformDirs: Partial<Record<Platform, string>>,
	entry: string,
	removedAgentsPath: string,
): Promise<void> {
	for (const dir of Object.values(platformDirs)) {
		if (!dir) continue
		const link = path.join(dir, entry)
		try {
			const stat = await fs.lstat(link)
			if (!stat.isSymbolicLink()) continue
			const resolved = await fs.realpath(link).catch(() => "")
			if (resolved === removedAgentsPath || resolved === "") {
				await fs.remove(link)
			}
		} catch {}
	}
}

export interface RemoveOptions {
	skipIntro?: boolean
	scope?: ScopeChoice
}

export async function remove(type?: string, options?: RemoveOptions) {
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

		const normalizedType = currentType.toLowerCase().endsWith("s")
			? currentType.slice(0, -1)
			: currentType
		const subdir = TYPE_SUBDIRS[normalizedType] ?? "skills"

		const scopeChoice = await chooseListRemoveScope({
			action: "remove",
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

		const scopedBases = buildScopedBases(
			scopeChoice.scope,
			scopeChoice.homedir,
			scopeChoice.projectRoot,
		)

		const s = spinner()
		s.start("Scanning for installed items...")
		const scannedItems = await scanInstalledItems(
			scopedBases,
			subdir,
			normalizedType,
		)
		s.stop(`Found ${scannedItems.length} installed ${normalizedType}s.`)

		if (scannedItems.length === 0) {
			note(`No installed ${normalizedType}s found.`, "Information")
			if (isSingleShot) break
			currentType = undefined
			continue
		}

		const itemSelections = await autocompleteMultiselect({
			message: `Select ${normalizedType}s to remove:`,
			options: scannedItems.map((item) => ({
				value: item.key,
				label: item.label,
			})),
		})

		if (isCancel(itemSelections)) {
			if (isSingleShot) break
			currentType = undefined
			continue
		}

		const itemsByKey = new Map(scannedItems.map((i) => [i.key, i]))
		const selectedScannedItems = (itemSelections as string[])
			.map((key) => itemsByKey.get(key))
			.filter((i): i is ScannedItem => !!i)

		const confirmDelete = await confirm({
			message: `Are you sure you want to remove ${selectedScannedItems.length} item(s) from .agents?`,
			initialValue: false,
		})

		if (isCancel(confirmDelete) || !confirmDelete) {
			if (isSingleShot) break
			currentType = undefined
			continue
		}

		const sDel = spinner()
		sDel.start("Removing items...")

		let removedCount = 0
		let notFoundCount = 0
		const errors: string[] = []

		const basesByScope = new Map<Scope, ScopedBase>()
		for (const sb of scopedBases) {
			basesByScope.set(sb.scope, sb)
		}

		for (const item of selectedScannedItems) {
			const scoped = basesByScope.get(item.scope)
			if (!scoped) continue

			const agentsPath = path.join(scoped.base, subdir, item.name)

			if (await fs.pathExists(agentsPath)) {
				sDel.message(`Removing ${pc.bold(item.label)} from .agents...`)
				try {
					await fs.remove(agentsPath)
					removedCount++
					const platformDirs = getPlatformDirs(
						item.scope,
						scoped.root,
						normalizedType,
					)
					await pruneDanglingLinks(platformDirs, item.name, agentsPath)
				} catch (err) {
					const msg = err instanceof Error ? err.message : String(err)
					errors.push(`${item.label}: ${msg}`)
				}
			} else {
				notFoundCount++
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
