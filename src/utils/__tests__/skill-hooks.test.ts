import os from "node:os"
import path from "node:path"
import fs from "fs-extra"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TYPE_DIRS } from "../paths.js"
import { hasSkillHooks, installSkillHooks } from "../skill-hooks.js"

const gitCommit = path.join(TYPE_DIRS.skill, "git-commit")

describe("skill hooks", () => {
	let tmp: string

	beforeEach(async () => {
		tmp = await fs.mkdtemp(path.join(os.tmpdir(), "skill-hooks-"))
	})

	afterEach(async () => {
		await fs.remove(tmp)
		vi.restoreAllMocks()
	})

	it("hasSkillHooks detects a hooks/hooks.json manifest", async () => {
		expect(await hasSkillHooks(gitCommit)).toBe(true)
		expect(await hasSkillHooks(tmp)).toBe(false)
	})

	it("copies hook files and wires them with a project-dir command", async () => {
		const files = await installSkillHooks(gitCommit, "project", tmp)

		const hooksDir = path.join(tmp, ".claude", "hooks")
		expect(files).toEqual([path.join(hooksDir, "commit-gate.py")])
		expect(await fs.pathExists(path.join(hooksDir, "hooks.json"))).toBe(false)

		const { hooks } = await fs.readJson(
			path.join(tmp, ".claude", "settings.json"),
		)
		const command = 'python3 "$CLAUDE_PROJECT_DIR"/.claude/hooks/commit-gate.py'
		expect(hooks.PreToolUse[0].matcher).toBe("AskUserQuestion|Bash")
		expect(hooks.PreToolUse[0].hooks[0].command).toBe(command)
		expect(hooks.Stop[0].hooks[0].command).toBe(command)
		expect(hooks.PostToolUse[0].matcher).toBe("AskUserQuestion")
	})

	it("does not duplicate an existing global registration", async () => {
		vi.spyOn(os, "homedir").mockReturnValue(tmp)
		const hook = {
			type: "command",
			command: `python3 ${path.join(tmp, ".claude", "hooks", "commit-gate.py")}`,
			timeout: 10,
		}
		const settingsFile = path.join(tmp, ".claude", "settings.json")
		await fs.ensureDir(path.dirname(settingsFile))
		await fs.writeJson(settingsFile, {
			hooks: {
				PreToolUse: [{ matcher: "AskUserQuestion|Bash", hooks: [hook] }],
				Stop: [{ hooks: [hook] }],
				PostToolUse: [
					{ matcher: "AskUserQuestion", hooks: [hook] },
					{ matcher: "Write|Edit", hooks: [] },
				],
			},
		})

		await installSkillHooks(gitCommit, "global", tmp)

		const { hooks } = await fs.readJson(settingsFile)
		expect(hooks.PreToolUse).toHaveLength(1)
		expect(hooks.Stop).toHaveLength(1)
		expect(hooks.PostToolUse).toHaveLength(2)
	})

	it("copies files but wires nothing when the manifest has no hooks", async () => {
		const skill = path.join(tmp, "skill")
		await fs.outputJson(path.join(skill, "hooks", "hooks.json"), {})
		await fs.outputFile(path.join(skill, "hooks", "x.sh"), "")

		const files = await installSkillHooks(skill, "project", tmp)

		expect(files).toEqual([path.join(tmp, ".claude", "hooks", "x.sh")])
		expect(
			await fs.pathExists(path.join(tmp, ".claude", "settings.json")),
		).toBe(false)
	})
})
