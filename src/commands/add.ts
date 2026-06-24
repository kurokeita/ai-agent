import path from "node:path"

import {
	autocompleteMultiselect,
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
import {
	detectConflicts,
	dropAgentsEntry,
	type LinkSubdir,
	mergeConflicts,
	type PreExistingEntry,
	removeAgentDirEntries,
	wireAgentSetup,
} from "@/utils/agent-setup"
import { fetchSkillFromGitHub } from "@/utils/github"
import {
	getAgentsBase,
	PLATFORM_LABELS,
	type Platform,
	type Scope,
	TYPE_DIRS,
	TYPE_SUBDIRS,
} from "@/utils/paths"
import { enableAutocompleteMultiSelectShiftAToggle } from "@/utils/prompts"
import { chooseInstallScope } from "@/utils/scope-prompt"

enableAutocompleteMultiSelectShiftAToggle()

export interface AddOptions {
	skipIntro?: boolean
	scope?: Scope
}

export async function add(type?: string, url?: string, options?: AddOptions) {
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
			if (url) {
				const s = spinner()
				s.start(`Fetching ${normalizedType} from GitHub...`)
				try {
					const result = await fetchSkillFromGitHub(url)
					tempDir = result.tempDir
					selectedItems = [result.skillName]
					s.stop(pc.green(`Fetched ${normalizedType}: ${result.skillName}`))
				} catch (e) {
					s.error("Failed to fetch")
					throw e
				}
			} else {
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

				const items = await autocompleteMultiselect({
					message: `Select ${normalizedType}s to install:`,
					options: availableItems,
				})

				if (isCancel(items)) {
					if (isSingleShot) break
					currentType = undefined
					continue
				}
				selectedItems = items as string[]
			}

			const scopeChoice = await chooseInstallScope({ flag: options?.scope })
			if ("rejected" in scopeChoice) {
				if (tempDir) await fs.remove(tempDir)
				cancel(
					`Scope --scope=${options?.scope} unavailable: ${scopeChoice.reason}`,
				)
				process.exit(1)
				return
			}
			if (scopeChoice.cancelled) {
				if (tempDir) await fs.remove(tempDir)
				if (isSingleShot) break
				currentType = undefined
				continue
			}

			const { scope: chosenScope, root: scopeRoot } = scopeChoice
			const agentsBase = getAgentsBase(chosenScope, scopeRoot)
			const subdir = TYPE_SUBDIRS[normalizedType] ?? "skills"
			const targetBase = path.join(agentsBase, subdir)

			if (chosenScope === "project") {
				const proceed = await confirm({
					message: `Install to project scope at ${pc.cyan(scopeRoot)}?`,
					initialValue: true,
				})
				if (isCancel(proceed) || !proceed) {
					if (tempDir) await fs.remove(tempDir)
					if (isSingleShot) break
					currentType = undefined
					continue
				}
			}

			const subdirName = subdir as LinkSubdir
			const preExisting: PreExistingEntry[] = []
			for (const item of selectedItems) {
				const targetName =
					normalizedType === "skill" ? path.parse(item).name : item
				if (await fs.pathExists(path.join(targetBase, targetName))) {
					preExisting.push({ entry: targetName, subdir: subdirName })
				}
			}

			note(
				`Installing ${selectedItems.length} ${normalizedType}s to ${targetBase} (scope: ${chosenScope})...`,
				"Summary",
			)

			const s = spinner()
			s.start("Installing...")

			const errors: string[] = []
			let installedCount = 0

			await fs.ensureDir(targetBase)

			for (const item of selectedItems) {
				s.message(`Installing ${pc.bold(item)}...`)

				try {
					const sourcePath =
						url && tempDir
							? path.join(tempDir, item)
							: path.join(TYPE_DIRS[normalizedType], item)

					if (!(await fs.pathExists(sourcePath))) {
						throw new Error(`Item '${item}' not found at ${sourcePath}`)
					}

					const targetName =
						normalizedType === "skill" ? path.parse(item).name : item
					const targetPath = path.join(targetBase, targetName)

					await fs.copy(sourcePath, targetPath, { overwrite: true })
					installedCount++
				} catch (err: unknown) {
					const errorMessage = err instanceof Error ? err.message : String(err)
					errors.push(`${item}: ${errorMessage}`)
				}
			}

			if (tempDir) {
				await fs.remove(tempDir)
				tempDir = null
			}

			if (errors.length > 0) {
				s.stop(
					pc.yellow(
						`Completed with errors. Installed: ${installedCount}, Errors: ${errors.length}`,
					),
				)
				console.error(pc.red("\nErrors encountered:"))
				for (const e of errors) {
					console.error(pc.red(`- ${e}`))
				}
			} else {
				s.stop(
					pc.green(
						`Successfully installed ${installedCount} ${normalizedType}s.`,
					),
				)
			}

			if (installedCount > 0) {
				await maybeWireAgentSetup(
					agentsBase,
					chosenScope,
					scopeRoot,
					preExisting,
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

async function maybeWireAgentSetup(
	agentsBase: string,
	scope: Scope,
	root: string,
	preExisting: PreExistingEntry[],
): Promise<void> {
	const wire = await confirm({
		message: "Wire the agent-setup session-start hook now?",
		initialValue: true,
	})
	if (isCancel(wire) || !wire) return

	const selected = await multiselect<Platform>({
		message: "Which agents should be wired?",
		options: (Object.keys(PLATFORM_LABELS) as Platform[]).map((platform) => ({
			label: PLATFORM_LABELS[platform],
			value: platform,
		})),
		required: true,
	})
	if (isCancel(selected)) return
	const platforms = selected as Platform[]

	const resolved = await resolveConflicts(
		agentsBase,
		platforms,
		scope,
		root,
		preExisting,
	)
	if (resolved === "cancelled") return

	const s = spinner()
	s.start("Wiring agent-setup hook...")
	try {
		const result = await wireAgentSetup(agentsBase, scope, root, platforms)
		s.stop(
			pc.green(
				`Wired session-start hook for: ${result.wiredPlatforms.join(", ")}.`,
			),
		)
		if (platforms.includes("windsurf")) {
			note(
				"Windsurf has no session-start hook; its symlinks are created once now. Re-run .agents/hooks/agent-setup.sh to refresh.",
				"Note",
			)
		}
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : String(err)
		s.error(`Failed to wire agent-setup hook: ${errorMessage}`)
	}
}

async function resolveConflicts(
	agentsBase: string,
	platforms: Platform[],
	scope: Scope,
	root: string,
	preExisting: PreExistingEntry[],
): Promise<"ok" | "cancelled"> {
	const platformConflicts = await detectConflicts(
		agentsBase,
		platforms,
		scope,
		root,
	)
	const conflicts = mergeConflicts(platformConflicts, preExisting)
	if (conflicts.length === 0) return "ok"

	const overwrite = await multiselect<string>({
		message:
			"These entries already exist (in .agents and/or the selected agent dirs). Choose which to OVERWRITE (unselected entries are dropped from .agents):",
		options: conflicts.map((c) => ({ label: c.entry, value: c.entry })),
		required: false,
	})
	if (isCancel(overwrite)) return "cancelled"
	const toOverwrite = new Set(overwrite as string[])

	for (const conflict of conflicts) {
		if (toOverwrite.has(conflict.entry)) {
			await removeAgentDirEntries(conflict.targetPaths)
		} else {
			await dropAgentsEntry(agentsBase, conflict.subdir, conflict.entry)
		}
	}

	return "ok"
}
