import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
	getTargetPaths,
	PLATFORM_LABELS,
	PLATFORM_PATHS_AGENTS,
	PLATFORM_PATHS_SKILLS,
	PLATFORM_PATHS_WORKFLOWS,
	PROJECT_ROOT,
	TYPE_DIRS,
} from "../paths.js"

describe("src/utils/paths.ts", () => {
	it("should have a PROJECT_ROOT", () => {
		expect(PROJECT_ROOT).toBeDefined()
		expect(path.isAbsolute(PROJECT_ROOT)).toBe(true)
	})

	it("should have PLATFORM_LABELS", () => {
		expect(PLATFORM_LABELS.gemini).toBe("Gemini CLI")
		expect(PLATFORM_LABELS.copilot).toBe("GitHub Copilot")
	})

	it("should have PLATFORM_PATHS_SKILLS", () => {
		const home = os.homedir()
		expect(PLATFORM_PATHS_SKILLS.gemini).toBe(path.join(home, ".gemini/skills"))
	})

	it("should have TYPE_DIRS", () => {
		expect(TYPE_DIRS.skill).toBe(path.join(PROJECT_ROOT, "skills"))
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
