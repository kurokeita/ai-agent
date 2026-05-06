import path from "node:path"
import {
	autocompleteMultiselect,
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
import {
	getTargetPaths,
	PLATFORM_LABELS,
	type Platform,
	type Scope,
} from "@/utils/paths"
import { codexEntryMatchesType } from "@/utils/platforms/codex"
import { enableAutocompleteMultiSelectShiftAToggle } from "@/utils/prompts"
import { chooseListRemoveScope, type ScopeChoice } from "@/utils/scope-prompt"

enableAutocompleteMultiSelectShiftAToggle()

interface ScopedTargetPaths {
	scope: Scope
	paths: Partial<Record<Platform, string>>
}

interface ScannedItem {
	key: string
	label: string
	name: string
	scope: Scope
}

function buildScopedTargetPaths(
	normalizedType: string,
	scope: ScopeChoice,
	projectRoot: string | undefined,
): ScopedTargetPaths[] {
	const out: ScopedTargetPaths[] = []
	if (scope === "global" || scope === "both") {
		out.push({
			scope: "global",
			paths: getTargetPaths(normalizedType, "global"),
		})
	}
	if ((scope === "project" || scope === "both") && projectRoot) {
		out.push({
			scope: "project",
			paths: getTargetPaths(normalizedType, "project", projectRoot),
		})
	}
	return out
}

async function scanInstalledItems(
	scopedPaths: ScopedTargetPaths[],
	normalizedType: string,
): Promise<ScannedItem[]> {
	const seen = new Set<string>()
	const items: ScannedItem[] = []
	const showScopePrefix = scopedPaths.length > 1

	for (const { scope, paths } of scopedPaths) {
		for (const [platform, pathStr] of Object.entries(paths)) {
			if (!pathStr) continue
			if (!(await fs.pathExists(pathStr))) continue

			const entries = await fs.readdir(pathStr, { withFileTypes: true })
			for (const entry of entries) {
				let qualifies = false
				if (platform === "codex") {
					qualifies = await codexEntryMatchesType(
						pathStr,
						entry,
						normalizedType,
					)
				} else if (
					entry.isDirectory() ||
					(normalizedType === "workflow" &&
						entry.isFile() &&
						entry.name.endsWith(".md")) ||
					(normalizedType === "agent" &&
						entry.isFile() &&
						entry.name.endsWith(".md"))
				) {
					qualifies = true
				}
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
	}

	return items.sort((a, b) => a.label.localeCompare(b.label))
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

		// Normalize type
		const normalizedType = currentType.toLowerCase().endsWith("s")
			? currentType.slice(0, -1)
			: currentType

		// Scope selection (with guard + soft-refuse fallback)
		const scopeChoice = await chooseListRemoveScope({
			action: "remove",
			flag: options?.scope,
		})
		if (scopeChoice.cancelled) {
			if (isSingleShot) break
			currentType = undefined
			continue
		}

		const scopedPaths = buildScopedTargetPaths(
			normalizedType,
			scopeChoice.scope,
			scopeChoice.projectRoot,
		)

		// 1. Scan items across selected scopes
		const s = spinner()
		s.start("Scanning for installed items...")
		const scannedItems = await scanInstalledItems(scopedPaths, normalizedType)
		s.stop(`Found ${scannedItems.length} installed ${normalizedType}s.`)

		if (scannedItems.length === 0) {
			note(`No installed ${normalizedType}s found.`, "Information")
			if (isSingleShot) break
			currentType = undefined
			continue
		}

		// 2. Select Items
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

		// 3. Select Platforms (union across the selected scopes' supported platforms)
		const supportedPlatforms = new Set<Platform>()
		for (const { paths } of scopedPaths) {
			for (const platform of Object.keys(paths)) {
				if (paths[platform as Platform])
					supportedPlatforms.add(platform as Platform)
			}
		}
		const platformOptions = [...supportedPlatforms].map((platform) => ({
			label: PLATFORM_LABELS[platform],
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
			message: `Are you sure you want to remove ${selectedScannedItems.length} item(s) from ${selectedPlatforms.length} platform(s)?`,
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

		const pathsByScope = new Map<Scope, Partial<Record<Platform, string>>>()
		for (const { scope, paths } of scopedPaths) {
			pathsByScope.set(scope, paths)
		}

		for (const platform of selectedPlatforms) {
			for (const item of selectedScannedItems) {
				const targetBase = pathsByScope.get(item.scope)?.[platform]
				if (!targetBase) continue

				const targetPath = path.join(targetBase, item.name)

				if (await fs.pathExists(targetPath)) {
					sDel.message(
						`Removing ${pc.bold(item.label)} from ${pc.cyan(platform)}...`,
					)
					try {
						await fs.remove(targetPath)
						removedCount++
					} catch (err) {
						const msg = err instanceof Error ? err.message : String(err)
						errors.push(`${item.label} (${platform}): ${msg}`)
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
