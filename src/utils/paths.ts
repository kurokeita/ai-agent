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
	| "claude-code"
	| "copilot"
	| "windsurf"
	| "antigravity"
	| "gemini"
	| "codex"

export type Scope = "global" | "project"

export const PLATFORM_LABELS: Record<Platform, string> = {
	antigravity: "Antigravity",
	"claude-code": "Claude Code",
	codex: "Codex",
	gemini: "Gemini CLI",
	copilot: "GitHub Copilot",
	windsurf: "Windsurf",
}

export const PLATFORM_PATHS_SKILLS: Record<Platform, string> = {
	antigravity: path.join(os.homedir(), ".gemini/antigravity/global_skills"),
	"claude-code": path.join(os.homedir(), ".claude/skills"),
	codex: path.join(os.homedir(), ".codex/skills"),
	copilot: path.join(os.homedir(), ".copilot/skills"),
	gemini: path.join(os.homedir(), ".gemini/skills"),
	windsurf: path.join(os.homedir(), ".codeium/windsurf/skills"),
}

export const PLATFORM_PATHS_AGENTS: Partial<Record<Platform, string>> = {
	"claude-code": path.join(os.homedir(), ".claude/agents"),
	codex: path.join(os.homedir(), ".codex/skills"),
	copilot: path.join(os.homedir(), ".copilot/agents"),
	gemini: path.join(os.homedir(), ".gemini/agents"),
}

export const PLATFORM_PATHS_WORKFLOWS: Partial<Record<Platform, string>> = {
	antigravity: path.join(os.homedir(), ".gemini/antigravity/global_workflows"),
	"claude-code": path.join(os.homedir(), ".claude/commands"),
	codex: path.join(os.homedir(), ".codex/skills"),
	copilot: path.join(os.homedir(), ".copilot/prompts"),
	gemini: path.join(os.homedir(), ".gemini/commands"),
	windsurf: path.join(os.homedir(), ".codeium/windsurf/global_workflows"),
}

const PROJECT_RELATIVE_PLATFORM_PATHS_SKILLS: Record<Platform, string> = {
	antigravity: ".gemini/antigravity/skills",
	"claude-code": ".claude/skills",
	codex: ".codex/skills",
	copilot: ".copilot/skills",
	gemini: ".gemini/skills",
	windsurf: ".codeium/windsurf/skills",
}

const PROJECT_RELATIVE_PLATFORM_PATHS_AGENTS: Partial<
	Record<Platform, string>
> = {
	"claude-code": ".claude/agents",
	codex: ".codex/skills",
	copilot: ".copilot/agents",
	gemini: ".gemini/agents",
}

const PROJECT_RELATIVE_PLATFORM_PATHS_WORKFLOWS: Partial<
	Record<Platform, string>
> = {
	antigravity: ".gemini/antigravity/workflows",
	"claude-code": ".claude/commands",
	codex: ".codex/skills",
	copilot: ".copilot/prompts",
	gemini: ".gemini/commands",
	windsurf: ".codeium/windsurf/workflows",
}

function resolveProjectPaths<T extends Partial<Record<Platform, string>>>(
	relative: T,
	root: string,
): T {
	const out: Partial<Record<Platform, string>> = {}
	for (const [platform, rel] of Object.entries(relative)) {
		if (rel) out[platform as Platform] = path.join(root, rel)
	}
	return out as T
}

export function getProjectPlatformPathsSkills(
	root: string,
): Record<Platform, string> {
	return resolveProjectPaths(PROJECT_RELATIVE_PLATFORM_PATHS_SKILLS, root)
}

export function getProjectPlatformPathsAgents(
	root: string,
): Partial<Record<Platform, string>> {
	return resolveProjectPaths(PROJECT_RELATIVE_PLATFORM_PATHS_AGENTS, root)
}

export function getProjectPlatformPathsWorkflows(
	root: string,
): Partial<Record<Platform, string>> {
	return resolveProjectPaths(PROJECT_RELATIVE_PLATFORM_PATHS_WORKFLOWS, root)
}

export const TYPE_DIRS: Record<string, string> = {
	skill: path.join(PROJECT_ROOT, "skills"),
	agent: path.join(PROJECT_ROOT, "agents"),
	workflow: path.join(PROJECT_ROOT, "workflows"),
}

// Workflows normalize to the universal `commands` directory.
export const TYPE_SUBDIRS: Record<string, string> = {
	skill: "skills",
	agent: "agents",
	workflow: "commands",
}

export const AGENT_SETUP_SCRIPTS_DIR = path.join(
	PROJECT_ROOT,
	"skills/universalize-agents/scripts",
)

export const HOOK_TEMPLATES_DIR = path.join(
	PROJECT_ROOT,
	"skills/universalize-agents/reference/hook-templates",
)

export function getAgentsBase(scope: Scope, root?: string): string {
	if (scope === "project") {
		return path.join(root ?? process.cwd(), ".agents")
	}
	return path.join(os.homedir(), ".agents")
}
