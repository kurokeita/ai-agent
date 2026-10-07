import os from "node:os"
import path from "node:path"
import fs from "fs-extra"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TYPE_DIRS } from "../paths.js"
import {
	hasSkillHooks,
	installSkillHooks,
	planSkillHooks,
	printable,
} from "../skill-hooks.js"

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

	it("plans the resolved commands without touching disk", async () => {
		const plan = await planSkillHooks(gitCommit, "project", tmp)
		const command = 'python3 "$CLAUDE_PROJECT_DIR"/.claude/hooks/commit-gate.py'
		expect(plan).toEqual({
			commands: [
				`PreToolUse [AskUserQuestion|Bash]: ${command}`,
				`Stop: ${command}`,
				`PostToolUse [AskUserQuestion]: ${command}`,
			],
			replaces: [],
		})
		expect(await fs.pathExists(path.join(tmp, ".claude"))).toBe(false)
	})

	it("flags an existing hook file only when its content differs", async () => {
		const dest = path.join(tmp, ".claude", "hooks", "commit-gate.py")
		await fs.copy(path.join(gitCommit, "hooks", "commit-gate.py"), dest)
		expect((await planSkillHooks(gitCommit, "project", tmp)).replaces).toEqual(
			[],
		)

		await fs.writeFile(dest, "# a different hook\n")
		expect((await planSkillHooks(gitCommit, "project", tmp)).replaces).toEqual([
			dest,
		])
	})

	it("refuses hook entries that are not regular files", async () => {
		const skill = path.join(tmp, "skill")
		await fs.outputJson(path.join(skill, "hooks", "hooks.json"), {})
		await fs.symlink(
			path.join(tmp, "elsewhere.sh"),
			path.join(skill, "hooks", "link.sh"),
		)

		await expect(planSkillHooks(skill, "project", tmp)).rejects.toThrow(
			"hooks/link.sh must be a regular file with a printable name",
		)
		await expect(installSkillHooks(skill, "project", tmp)).rejects.toThrow(
			"hooks/link.sh must be a regular file with a printable name",
		)
	})

	it("printable escapes control characters", () => {
		expect(printable("a\u001b[2Jb\u009b")).toBe("a\\x1b[2Jb\\x9b")
		expect(printable("plain")).toBe("plain")
	})

	it("refuses hook file names with control characters", async () => {
		const skill = path.join(tmp, "skill")
		await fs.outputJson(path.join(skill, "hooks", "hooks.json"), {})
		await fs.outputFile(path.join(skill, "hooks", "x\u001b.sh"), "")

		await expect(planSkillHooks(skill, "project", tmp)).rejects.toThrow(
			"hooks/x\\x1b.sh must be a regular file with a printable name",
		)
	})

	const command = { type: "command", command: "run.sh" }
	it.each([
		["a non-object manifest", []],
		["a non-object hooks key", { hooks: [] }],
		["an event that is not a list", { hooks: { Stop: {} } }],
		[
			"an entry key other than matcher/hooks",
			{ hooks: { Stop: [{ hooks: [command], extra: 1 }] } },
		],
		[
			"a non-command hook type",
			{ hooks: { Stop: [{ hooks: [{ type: "prompt", prompt: "x" }] }] } },
		],
		[
			"an extra hook key",
			{ hooks: { Stop: [{ hooks: [{ ...command, env: "x" }] }] } },
		],
		[
			"a control character in a command",
			{ hooks: { Stop: [{ hooks: [{ ...command, command: "a\u001b[2J" }] }] } },
		],
		[
			"a control character in a matcher",
			{ hooks: { Stop: [{ matcher: "Bash\u001b", hooks: [command] }] } },
		],
		[
			"a non-number timeout",
			{ hooks: { Stop: [{ hooks: [{ ...command, timeout: "10" }] }] } },
		],
	])("rejects a manifest with %s and copies nothing", async (_, manifest) => {
		const skill = path.join(tmp, "skill")
		await fs.outputJson(path.join(skill, "hooks", "hooks.json"), manifest)
		await fs.outputFile(path.join(skill, "hooks", "run.sh"), "")

		await expect(planSkillHooks(skill, "project", tmp)).rejects.toThrow(
			"hooks/hooks.json",
		)
		await expect(installSkillHooks(skill, "project", tmp)).rejects.toThrow(
			"hooks/hooks.json",
		)
		expect(await fs.pathExists(path.join(tmp, ".claude"))).toBe(false)
	})
})
