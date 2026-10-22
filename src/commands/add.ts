import path from "node:path"

import {
	autocompleteMultiselect,
	cancel,
	confirm,
	intro,
	isCancel,
	log,
	multiselect,
	note,
	outro,
	spinner,
} from "@clack/prompts"
import fs from "fs-extra"
import pc from "picocolors"
import {
	detectConflicts,
	dropAgentsEntry,
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
} from "@/utils/paths"
import { enableAutocompleteMultiSelectShiftAToggle } from "@/utils/prompts"
import { chooseInstallScope } from "@/utils/scope-prompt"
import {
	hasSkillHooks,
	installSkillHooks,
	planSkillHooks,
	printable,
} from "@/utils/skill-hooks"

enableAutocompleteMultiSelectShiftAToggle()

export interface AddOptions {
	skipIntro?: boolean
	scope?: Scope
}

export async function add(type?: string, url?: string, options?: AddOptions) {
	if (!options?.skipIntro) {
		intro(pc.bgCyan(pc.black(" AI Manager : Add ")))
	}

	await installSkills(type, url, options)

	if (!options?.skipIntro) {
		outro("You're all set!")
	}
}

async function installSkills(
	type: string | undefined,
	url: string | undefined,
	options: AddOptions | undefined,
) {
	const normalizedType = type
		? type.toLowerCase().endsWith("s") && type.length > 1
			? type.slice(0, -1)
			: type
		: "skill"

	if (!TYPE_DIRS[normalizedType]) {
		cancel(`Unknown type: ${type}. Supported: skill`)
		process.exit(1)
		return
	}

	let tempDir: string | null = null
	let isGitHubFile = false
	let selectedItems: string[] = []

	try {
		if (url) {
			const s = spinner()
			s.start("Fetching skill from GitHub...")
			try {
				const result = await fetchSkillFromGitHub(url)
				tempDir = result.tempDir
				isGitHubFile = result.isFile
				selectedItems = [result.skillName]
				s.stop(pc.green(`Fetched skill: ${result.skillName}`))
			} catch (e) {
				s.error("Failed to fetch")
				throw e
			}
		} else {
			const sourceDir = TYPE_DIRS.skill
			if (!(await fs.pathExists(sourceDir))) {
				cancel("skill directory not found!")
				process.exit(1)
				return
			}

			const entries = await fs.readdir(sourceDir, { withFileTypes: true })
			const availableItems = entries
				.filter((entry) => entry.isDirectory())
				.map((entry) => ({ label: entry.name, value: entry.name }))
				.sort((a, b) => a.label.localeCompare(b.label))

			if (availableItems.length === 0) {
				note("No skills found in directory.", "Information")
				return
			}

			const items = await autocompleteMultiselect({
				message: "Select skills to install:",
				options: availableItems,
			})

			if (isCancel(items)) return
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
			return
		}

		const { scope: chosenScope, root: scopeRoot } = scopeChoice
		const agentsBase = getAgentsBase(chosenScope, scopeRoot)
		const targetBase = path.join(agentsBase, "skills")

		if (chosenScope === "project") {
			const proceed = await confirm({
				message: `Install to project scope at ${pc.cyan(scopeRoot)}?`,
				initialValue: true,
			})
			if (isCancel(proceed) || !proceed) {
				if (tempDir) await fs.remove(tempDir)
				return
			}
		}

		const preExisting: PreExistingEntry[] = []
		for (const item of selectedItems) {
			const targetName = path.parse(item).name
			if (await fs.pathExists(path.join(targetBase, targetName))) {
				preExisting.push({ entry: targetName, subdir: "skills" })
			}
		}

		// Confirm overwrites of pre-existing .agents entries BEFORE copying, so a
		// canonical copy is never destroyed without consent. Unselected entries are
		// kept as-is and skipped from installation.
		const skipEntries = new Set<string>()
		if (preExisting.length > 0) {
			const toOverwrite = await multiselect<string>({
				message:
					"These entries already exist in .agents. Choose which to OVERWRITE (unselected entries are kept and skipped):",
				options: preExisting.map((p) => ({ label: p.entry, value: p.entry })),
				required: false,
			})
			if (isCancel(toOverwrite)) {
				if (tempDir) await fs.remove(tempDir)
				return
			}
			const keep = new Set(toOverwrite as string[])
			for (const { entry } of preExisting) {
				if (!keep.has(entry)) skipEntries.add(entry)
			}
		}

		note(
			`Installing ${selectedItems.length} skills to ${targetBase} (scope: ${chosenScope})...`,
			"Summary",
		)

		const s = spinner()
		s.start("Installing...")

		const errors: string[] = []
		const installed: string[] = []

		await fs.ensureDir(targetBase)

		for (const item of selectedItems) {
			const targetName = path.parse(item).name
			if (skipEntries.has(targetName)) continue

			s.message(`Installing ${pc.bold(item)}...`)

			try {
				const sourcePath =
					url && tempDir
						? isGitHubFile
							? path.join(tempDir, item)
							: tempDir
						: path.join(TYPE_DIRS.skill, item)

				if (!(await fs.pathExists(sourcePath))) {
					throw new Error(`Item '${item}' not found at ${sourcePath}`)
				}

				const targetPath = path.join(targetBase, targetName)

				await fs.copy(sourcePath, targetPath, { overwrite: true })
				installed.push(targetPath)
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
					`Completed with errors. Installed: ${installed.length}, Errors: ${errors.length}`,
				),
			)
			console.error(pc.red("\nErrors encountered:"))
			for (const e of errors) {
				console.error(pc.red(`- ${e}`))
			}
		} else {
			s.stop(pc.green(`Successfully installed ${installed.length} skills.`))
		}

		if (installed.length > 0) {
			await maybeWireAgentSetup(agentsBase, chosenScope, scopeRoot)
			await maybeInstallSkillHooks(installed, chosenScope, scopeRoot, !!url)
		}
	} catch (error) {
		if (tempDir) await fs.remove(tempDir)
		cancel(`An error occurred: ${error}`)
		process.exit(1)
		return
	}
}

async function maybeWireAgentSetup(
	agentsBase: string,
	scope: Scope,
	root: string,
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

	const resolved = await resolveConflicts(agentsBase, platforms, scope, root)
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

// Hooks run on every matching tool call, so show exactly what gets wired and
// default to "no" for skills fetched from a URL or that replace an existing hook.
async function maybeInstallSkillHooks(
	skillDirs: string[],
	scope: Scope,
	root: string,
	fromUrl: boolean,
): Promise<void> {
	for (const dir of skillDirs) {
		if (!(await hasSkillHooks(dir))) continue
		const name = printable(path.basename(dir))

		try {
			const { commands, replaces } = await planSkillHooks(dir, scope, root)
			note(
				[...commands, ...replaces.map((file) => `Replaces ${file}`)]
					.map(printable)
					.join("\n"),
				`Claude Code hooks in ${name}`,
			)
			const install = await confirm({
				message: `Install the Claude Code hooks bundled with ${name}?`,
				initialValue: !fromUrl && replaces.length === 0,
			})
			if (isCancel(install) || !install) continue

			const files = await installSkillHooks(dir, scope, root)
			log.success(`Installed ${name} hooks: ${printable(files.join(", "))}.`)
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : String(err)
			log.error(`Failed to install ${name} hooks: ${printable(errorMessage)}`)
		}
	}
}

async function resolveConflicts(
	agentsBase: string,
	platforms: Platform[],
	scope: Scope,
	root: string,
): Promise<"ok" | "cancelled"> {
	const conflicts = await detectConflicts(agentsBase, platforms, scope, root)
	if (conflicts.length === 0) return "ok"

	const overwrite = await multiselect<string>({
		message:
			"These entries already exist in the selected agent dirs. Choose which to OVERWRITE (unselected entries are dropped from .agents):",
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
