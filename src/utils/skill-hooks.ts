import os from "node:os"
import path from "node:path"

import fs from "fs-extra"

import { mergeJsonHookFile } from "./agent-setup"
import type { Scope } from "./paths"

// A skill may ship Claude Code hooks in `<skill>/hooks/`. `hooks.json` holds the
// `hooks` object of `.claude/settings.json`; `${HOOKS_DIR}` in it resolves to the
// `.claude/hooks` dir the other files in `hooks/` are copied to.
const MANIFEST = "hooks.json"

export async function hasSkillHooks(skillDir: string): Promise<boolean> {
	return fs.pathExists(path.join(skillDir, "hooks", MANIFEST))
}

type HookEntry = { matcher?: string; hooks?: { command?: string }[] }

function hookTarget(scope: Scope, root: string) {
	const base = scope === "project" ? root : os.homedir()
	const hooksDir = path.join(base, ".claude", "hooks")
	const token =
		scope === "project" ? '"$CLAUDE_PROJECT_DIR"/.claude/hooks' : hooksDir
	return { base, hooksDir, token }
}

// Only regular files are copied: a symlink would point the hook outside the skill.
async function hookFiles(srcDir: string): Promise<string[]> {
	const files = (await fs.readdir(srcDir)).filter((file) => file !== MANIFEST)
	for (const file of files) {
		if (!(await fs.lstat(path.join(srcDir, file))).isFile()) {
			throw new Error(`hooks/${file} is not a regular file`)
		}
	}
	return files
}

async function readManifest(
	srcDir: string,
	token: string,
): Promise<Record<string, HookEntry[]>> {
	const raw = await fs.readFile(path.join(srcDir, MANIFEST), "utf-8")
	const manifest = JSON.parse(
		raw.replaceAll(`\${HOOKS_DIR}`, JSON.stringify(token).slice(1, -1)),
	) as { hooks?: Record<string, HookEntry[]> }
	return manifest.hooks ?? {}
}

export interface SkillHooksPlan {
	commands: string[]
	replaces: string[]
}

export async function planSkillHooks(
	skillDir: string,
	scope: Scope,
	root: string,
): Promise<SkillHooksPlan> {
	const { hooksDir, token } = hookTarget(scope, root)
	const srcDir = path.join(skillDir, "hooks")

	const replaces: string[] = []
	for (const file of await hookFiles(srcDir)) {
		const dest = path.join(hooksDir, file)
		if (!(await fs.pathExists(dest))) continue
		const [src, existing] = await Promise.all([
			fs.readFile(path.join(srcDir, file)),
			fs.readFile(dest),
		])
		if (!src.equals(existing)) replaces.push(dest)
	}

	const commands: string[] = []
	for (const [event, entries] of Object.entries(
		await readManifest(srcDir, token),
	)) {
		for (const entry of entries) {
			const matcher = entry.matcher ? ` [${entry.matcher}]` : ""
			for (const hook of entry.hooks ?? []) {
				commands.push(`${event}${matcher}: ${hook.command}`)
			}
		}
	}

	return { commands, replaces }
}

// ponytail: hook files share one flat .claude/hooks dir, so two skills shipping the
// same file name collide; planSkillHooks surfaces it, namespace per skill if it bites.
export async function installSkillHooks(
	skillDir: string,
	scope: Scope,
	root: string,
): Promise<string[]> {
	const { base, hooksDir, token } = hookTarget(scope, root)
	const srcDir = path.join(skillDir, "hooks")

	const files = await hookFiles(srcDir)
	for (const file of files) {
		await fs.copy(path.join(srcDir, file), path.join(hooksDir, file), {
			overwrite: true,
		})
	}

	const settings = path.join(base, ".claude", "settings.json")
	for (const [event, entries] of Object.entries(
		await readManifest(srcDir, token),
	)) {
		for (const entry of entries) {
			await mergeJsonHookFile(settings, event, entry)
		}
	}

	return files.map((file) => path.join(hooksDir, file))
}
