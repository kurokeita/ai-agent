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

// ponytail: hook files share one flat .claude/hooks dir, so two skills shipping the
// same file name overwrite each other; namespace per skill if that ever happens.
export async function installSkillHooks(
	skillDir: string,
	scope: Scope,
	root: string,
): Promise<string[]> {
	const base = scope === "project" ? root : os.homedir()
	const hooksDir = path.join(base, ".claude", "hooks")
	const srcDir = path.join(skillDir, "hooks")

	const files = (await fs.readdir(srcDir)).filter((file) => file !== MANIFEST)
	for (const file of files) {
		await fs.copy(path.join(srcDir, file), path.join(hooksDir, file), {
			overwrite: true,
		})
	}

	const token =
		scope === "project" ? '"$CLAUDE_PROJECT_DIR"/.claude/hooks' : hooksDir
	const raw = await fs.readFile(path.join(srcDir, MANIFEST), "utf-8")
	const manifest = JSON.parse(
		raw.replaceAll(`\${HOOKS_DIR}`, JSON.stringify(token).slice(1, -1)),
	) as { hooks?: Record<string, Record<string, unknown>[]> }

	const settings = path.join(base, ".claude", "settings.json")
	for (const [event, entries] of Object.entries(manifest.hooks ?? {})) {
		for (const entry of entries) {
			await mergeJsonHookFile(settings, event, entry)
		}
	}

	return files.map((file) => path.join(hooksDir, file))
}
