import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function hasBundledAssets(rootDir: string) {
	return ["skills", "agents", "workflows"].some((dir) =>
		fs.existsSync(path.join(rootDir, dir)),
	)
}

export function resolveProjectRoot(moduleDir: string) {
	const sourceRoot = path.resolve(moduleDir, "../..")
	if (hasBundledAssets(sourceRoot)) {
		return sourceRoot
	}

	return path.resolve(moduleDir, "..")
}

export const PROJECT_ROOT = resolveProjectRoot(__dirname)

export type Platform =
	| "copilot"
	| "windsurf"
	| "antigravity"
	| "gemini"
	| "codex"

export const PLATFORM_LABELS: Record<Platform, string> = {
	antigravity: "Antigravity",
	codex: "Codex",
	gemini: "Gemini CLI",
	copilot: "GitHub Copilot",
	windsurf: "Windsurf",
}

export const PLATFORM_PATHS_SKILLS: Record<Platform, string> = {
	antigravity: path.join(os.homedir(), ".gemini/antigravity/global_skills"),
	codex: path.join(os.homedir(), ".codex/skills"),
	copilot: path.join(os.homedir(), ".copilot/skills"),
	gemini: path.join(os.homedir(), ".gemini/skills"),
	windsurf: path.join(os.homedir(), ".codeium/windsurf/skills"),
}

export const PLATFORM_PATHS_AGENTS: Partial<Record<Platform, string>> = {
	codex: path.join(os.homedir(), ".codex/skills"),
	copilot: path.join(os.homedir(), ".copilot/agents"),
	gemini: path.join(os.homedir(), ".gemini/agents"),
}

export const PLATFORM_PATHS_WORKFLOWS: Partial<Record<Platform, string>> = {
	antigravity: path.join(os.homedir(), ".gemini/antigravity/global_workflows"),
	codex: path.join(os.homedir(), ".codex/skills"),
	copilot: path.join(os.homedir(), ".copilot/prompts"),
	gemini: path.join(os.homedir(), ".gemini/commands"),
	windsurf: path.join(os.homedir(), ".codeium/windsurf/global_workflows"),
}

export const TYPE_DIRS: Record<string, string> = {
	skill: path.join(PROJECT_ROOT, "skills"),
	agent: path.join(PROJECT_ROOT, "agents"),
	workflow: path.join(PROJECT_ROOT, "workflows"),
}

export function getTargetPaths(
	type: string,
): Partial<Record<Platform, string>> {
	switch (type) {
		case "agent":
			return PLATFORM_PATHS_AGENTS
		case "workflow":
			return PLATFORM_PATHS_WORKFLOWS
		default:
			return PLATFORM_PATHS_SKILLS
	}
}
