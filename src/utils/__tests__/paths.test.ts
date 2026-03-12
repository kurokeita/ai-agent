import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
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

	describe("getTargetPaths", () => {
		it('should return PLATFORM_PATHS_AGENTS for "agent" type', () => {
			const paths = getTargetPaths("agent")
			expect(paths).toBe(PLATFORM_PATHS_AGENTS)
		})

		it('should return PLATFORM_PATHS_WORKFLOWS for "workflow" type', () => {
			const paths = getTargetPaths("workflow")
			expect(paths).toBe(PLATFORM_PATHS_WORKFLOWS)
		})

		it('should return PLATFORM_PATHS_SKILLS for "skill" type', () => {
			const paths = getTargetPaths("skill")
			expect(paths).toBe(PLATFORM_PATHS_SKILLS)
		})

		it("should return PLATFORM_PATHS_SKILLS for unknown types", () => {
			const paths = getTargetPaths("unknown")
			expect(paths).toBe(PLATFORM_PATHS_SKILLS)
		})
	})
})
