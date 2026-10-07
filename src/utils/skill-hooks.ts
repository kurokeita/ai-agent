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

type Hook = { type: "command"; command: string; timeout?: number }
type HookEntry = { matcher?: string; hooks: Hook[] }

// Control, format (bidi overrides, zero-width) and line/paragraph separator chars.
const UNSAFE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u

function isUnsafe(char: string): boolean {
	return UNSAFE.test(char)
}

function escapeChar(char: string): string {
	const code = char.codePointAt(0) ?? 0
	return code <= 0xff
		? `\\x${code.toString(16).padStart(2, "0")}`
		: `\\u{${code.toString(16)}}`
}

// Escapes unsafe characters so a skill cannot redraw the terminal (ANSI
// sequences) or reorder/hide text (bidi, zero-width) in the install prompt.
export function printable(text: string): string {
	return [...text]
		.map((char) => (isUnsafe(char) ? escapeChar(char) : char))
		.join("")
}

function isText(value: unknown): value is string {
	return typeof value === "string" && ![...value].some(isUnsafe)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
	return Object.keys(value).every((key) => keys.includes(key))
}

function isHook(value: unknown): value is Hook {
	return (
		isRecord(value) &&
		hasOnlyKeys(value, ["type", "command", "timeout"]) &&
		value.type === "command" &&
		isText(value.command) &&
		(value.timeout === undefined || typeof value.timeout === "number")
	)
}

function isHookEntry(value: unknown): value is HookEntry {
	return (
		isRecord(value) &&
		hasOnlyKeys(value, ["matcher", "hooks"]) &&
		(value.matcher === undefined || isText(value.matcher)) &&
		Array.isArray(value.hooks) &&
		value.hooks.every(isHook)
	)
}

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
		if (!isText(file) || !(await fs.lstat(path.join(srcDir, file))).isFile()) {
			throw new Error(
				`hooks/${printable(file)} must be a regular file with a printable name`,
			)
		}
	}
	return files
}

async function readManifest(
	srcDir: string,
	token: string,
): Promise<Record<string, HookEntry[]>> {
	const raw = await fs.readFile(path.join(srcDir, MANIFEST), "utf-8")
	const manifest: unknown = JSON.parse(
		raw.replaceAll(`\${HOOKS_DIR}`, JSON.stringify(token).slice(1, -1)),
	)
	const hooks = isRecord(manifest) ? (manifest.hooks ?? {}) : undefined
	if (!isRecord(hooks)) {
		throw new Error(`hooks/${MANIFEST} must be an object with a "hooks" object`)
	}

	// Strict shape, so the commands shown before install are all that gets merged.
	for (const [event, entries] of Object.entries(hooks)) {
		if (
			!isText(event) ||
			!Array.isArray(entries) ||
			!entries.every(isHookEntry)
		) {
			throw new Error(
				`hooks/${MANIFEST}: "${printable(event)}" must list { matcher?, hooks: [{ type: "command", command, timeout? }] }`,
			)
		}
	}
	return hooks as Record<string, HookEntry[]>
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
			for (const hook of entry.hooks) {
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
	const manifest = await readManifest(srcDir, token)
	for (const file of files) {
		await fs.copy(path.join(srcDir, file), path.join(hooksDir, file), {
			overwrite: true,
		})
	}

	const settings = path.join(base, ".claude", "settings.json")
	for (const [event, entries] of Object.entries(manifest)) {
		for (const entry of entries) {
			await mergeJsonHookFile(settings, event, entry)
		}
	}

	return files.map((file) => path.join(hooksDir, file))
}
