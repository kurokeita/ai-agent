import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
	getProjectPlatformPathsAgents,
	getProjectPlatformPathsSkills,
	getProjectPlatformPathsWorkflows,
	getTargetPaths,
	PLATFORM_LABELS,
	PLATFORM_PATHS_AGENTS,
	PLATFORM_PATHS_SKILLS,
	PLATFORM_PATHS_WORKFLOWS,
	PROJECT_ROOT,
	resolveProjectRoot,
	TYPE_DIRS,
} from "../paths.js"

describe("src/utils/paths.ts", () => {
	const tempDirs: string[] = []

	afterEach(() => {
		for (const tempDir of tempDirs) {
			fs.rmSync(tempDir, { recursive: true, force: true })
		}
		tempDirs.length = 0
	})

	it("should have a PROJECT_ROOT", () => {
		expect(PROJECT_ROOT).toBeDefined()
		expect(path.isAbsolute(PROJECT_ROOT)).toBe(true)
	})

	it("should have PLATFORM_LABELS", () => {
		expect(PLATFORM_LABELS.gemini).toBe("Gemini CLI")
		expect(PLATFORM_LABELS.copilot).toBe("GitHub Copilot")
		expect(PLATFORM_LABELS.codex).toBe("Codex")
	})

	it("should have PLATFORM_PATHS_SKILLS", () => {
		const home = os.homedir()
		expect(PLATFORM_PATHS_SKILLS.gemini).toBe(path.join(home, ".gemini/skills"))
		expect(PLATFORM_PATHS_SKILLS.codex).toBe(path.join(home, ".codex/skills"))
	})

	it("should have Codex agent and workflow paths", () => {
		const home = os.homedir()
		expect(PLATFORM_PATHS_AGENTS.codex).toBe(path.join(home, ".codex/skills"))
		expect(PLATFORM_PATHS_WORKFLOWS.codex).toBe(
			path.join(home, ".codex/skills"),
		)
	})

	it("should have TYPE_DIRS", () => {
		expect(TYPE_DIRS.skill).toBe(path.join(PROJECT_ROOT, "skills"))
	})

	it("should resolve the published dist directory as the project root", () => {
		const tempPackageDir = fs.mkdtempSync(
			path.join(os.tmpdir(), "add-skill-paths-"),
		)
		tempDirs.push(tempPackageDir)
		fs.mkdirSync(path.join(tempPackageDir, "dist", "skills"), {
			recursive: true,
		})

		const publishedModuleDir = path.join(tempPackageDir, "dist", "utils")

		expect(resolveProjectRoot(publishedModuleDir)).toBe(
			path.join(tempPackageDir, "dist"),
		)
	})

	describe("getTargetPaths (global scope)", () => {
		it('should return PLATFORM_PATHS_AGENTS for "agent" type', () => {
			expect(getTargetPaths("agent")).toBe(PLATFORM_PATHS_AGENTS)
		})

		it('should return PLATFORM_PATHS_WORKFLOWS for "workflow" type', () => {
			expect(getTargetPaths("workflow")).toBe(PLATFORM_PATHS_WORKFLOWS)
		})

		it('should return PLATFORM_PATHS_SKILLS for "skill" type', () => {
			expect(getTargetPaths("skill")).toBe(PLATFORM_PATHS_SKILLS)
		})

		it("should return PLATFORM_PATHS_SKILLS for unknown types", () => {
			expect(getTargetPaths("unknown")).toBe(PLATFORM_PATHS_SKILLS)
		})

		it("should default to global scope when scope is omitted", () => {
			expect(getTargetPaths("skill")).toBe(getTargetPaths("skill", "global"))
		})
	})

	describe("getProjectPlatformPathsSkills", () => {
		const root = "/tmp/myrepo"

		it("maps every platform under the given root", () => {
			const paths = getProjectPlatformPathsSkills(root)
			expect(paths["claude-code"]).toBe(path.join(root, ".claude/skills"))
			expect(paths.codex).toBe(path.join(root, ".codex/skills"))
			expect(paths.copilot).toBe(path.join(root, ".copilot/skills"))
			expect(paths.gemini).toBe(path.join(root, ".gemini/skills"))
			expect(paths.windsurf).toBe(path.join(root, ".codeium/windsurf/skills"))
			expect(paths.antigravity).toBe(
				path.join(root, ".gemini/antigravity/skills"),
			)
		})
	})

	describe("getProjectPlatformPathsAgents", () => {
		const root = "/tmp/myrepo"

		it("maps the supported platforms only", () => {
			const paths = getProjectPlatformPathsAgents(root)
			expect(paths["claude-code"]).toBe(path.join(root, ".claude/agents"))
			expect(paths.codex).toBe(path.join(root, ".codex/skills"))
			expect(paths.copilot).toBe(path.join(root, ".copilot/agents"))
			expect(paths.gemini).toBe(path.join(root, ".gemini/agents"))
			expect(paths.antigravity).toBeUndefined()
			expect(paths.windsurf).toBeUndefined()
		})
	})

	describe("getProjectPlatformPathsWorkflows", () => {
		const root = "/tmp/myrepo"

		it("drops global_ prefix for antigravity and windsurf", () => {
			const paths = getProjectPlatformPathsWorkflows(root)
			expect(paths.antigravity).toBe(
				path.join(root, ".gemini/antigravity/workflows"),
			)
			expect(paths.windsurf).toBe(
				path.join(root, ".codeium/windsurf/workflows"),
			)
		})

		it("maps remaining platforms", () => {
			const paths = getProjectPlatformPathsWorkflows(root)
			expect(paths["claude-code"]).toBe(path.join(root, ".claude/skills"))
			expect(paths.codex).toBe(path.join(root, ".codex/skills"))
			expect(paths.copilot).toBe(path.join(root, ".copilot/prompts"))
			expect(paths.gemini).toBe(path.join(root, ".gemini/commands"))
		})
	})

	describe("getTargetPaths (project scope)", () => {
		const root = "/tmp/myrepo"

		it("returns project skill paths", () => {
			const paths = getTargetPaths("skill", "project", root)
			expect(paths["claude-code"]).toBe(path.join(root, ".claude/skills"))
		})

		it("returns project agent paths", () => {
			const paths = getTargetPaths("agent", "project", root)
			expect(paths["claude-code"]).toBe(path.join(root, ".claude/agents"))
			expect(paths.antigravity).toBeUndefined()
		})

		it("returns project workflow paths", () => {
			const paths = getTargetPaths("workflow", "project", root)
			expect(paths.antigravity).toBe(
				path.join(root, ".gemini/antigravity/workflows"),
			)
		})

		it("falls back to project skill paths for unknown type", () => {
			const paths = getTargetPaths("unknown", "project", root)
			expect(paths["claude-code"]).toBe(path.join(root, ".claude/skills"))
		})

		it("uses process.cwd() when projectRoot is omitted", () => {
			const paths = getTargetPaths("skill", "project")
			expect(paths["claude-code"]).toBe(
				path.join(process.cwd(), ".claude/skills"),
			)
		})
	})
})
