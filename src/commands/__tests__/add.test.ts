import os from "node:os"
import * as prompts from "@clack/prompts"
import fs from "fs-extra"
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest"
import {
	detectConflicts,
	dropAgentsEntry,
	mergeConflicts,
	removeAgentDirEntries,
	wireAgentSetup,
} from "../../utils/agent-setup.js"
import { fetchSkillFromGitHub } from "../../utils/github.js"
import {
	getAgentsBase,
	PLATFORM_LABELS,
	TYPE_DIRS,
	TYPE_SUBDIRS,
} from "../../utils/paths.js"
import { chooseInstallScope } from "../../utils/scope-prompt.js"
import { add } from "../add.js"

vi.mock("fs-extra")
vi.mock("@clack/prompts")
vi.mock("../../utils/github.js")
vi.mock("../../utils/paths.js")
vi.mock("../../utils/scope-prompt.js")
vi.mock("../../utils/agent-setup.js")

describe(add.name, () => {
	let mockExit: MockInstance
	let mockConsoleError: MockInstance

	beforeEach(() => {
		mockExit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never)
		vi.spyOn(console, "log").mockImplementation(() => {})
		mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {})

		vi.mocked(prompts.isCancel).mockReturnValue(false)
		vi.mocked(prompts.spinner).mockReturnValue({
			start: vi.fn(),
			stop: vi.fn(),
			message: vi.fn(),
			error: vi.fn(),
			cancel: vi.fn(),
		})
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValue([])
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockResolvedValue(true)
		vi.mocked(fs.stat as unknown as () => Promise<fs.Stats>).mockResolvedValue({
			isFile: () => false,
		} as fs.Stats)

		vi.mocked(TYPE_DIRS).skill = "/mock/skills"
		vi.mocked(TYPE_DIRS).agent = "/mock/agents"
		vi.mocked(TYPE_DIRS).workflow = "/mock/workflows"
		vi.mocked(TYPE_SUBDIRS).skill = "skills"
		vi.mocked(TYPE_SUBDIRS).agent = "agents"
		vi.mocked(TYPE_SUBDIRS).workflow = "commands"
		vi.mocked(getAgentsBase).mockReturnValue("/mock/home/.agents")
		vi.mocked(PLATFORM_LABELS)["claude-code"] = "Claude Code"
		vi.mocked(PLATFORM_LABELS).gemini = "Gemini CLI"
		vi.mocked(PLATFORM_LABELS).codex = "Codex"
		vi.mocked(PLATFORM_LABELS).copilot = "GitHub Copilot"
		vi.mocked(PLATFORM_LABELS).windsurf = "Windsurf"
		vi.mocked(PLATFORM_LABELS).antigravity = "Antigravity"
		vi.mocked(wireAgentSetup).mockResolvedValue({
			wiredPlatforms: ["claude-code", "gemini"],
			ranScript: true,
		})
		vi.mocked(detectConflicts).mockResolvedValue([])
		vi.mocked(mergeConflicts).mockImplementation((platformConflicts, pre) => {
			const byKey = new Map<
				string,
				{ entry: string; subdir: string; targetPaths: string[] }
			>()
			for (const c of platformConflicts) {
				byKey.set(`${c.subdir} ${c.entry}`, {
					...c,
					targetPaths: [...c.targetPaths],
				})
			}
			for (const p of pre) {
				const key = `${p.subdir} ${p.entry}`
				if (!byKey.has(key)) {
					byKey.set(key, { entry: p.entry, subdir: p.subdir, targetPaths: [] })
				}
			}
			return [...byKey.values()] as ReturnType<typeof mergeConflicts>
		})
		vi.mocked(removeAgentDirEntries).mockResolvedValue(undefined)
		vi.mocked(dropAgentsEntry).mockResolvedValue(undefined)

		vi.mocked(prompts.confirm).mockResolvedValue(true)
		vi.mocked(prompts.multiselect).mockResolvedValue(["claude-code"])
		vi.mocked(prompts.select).mockResolvedValue("exit")

		vi.mocked(chooseInstallScope).mockResolvedValue({
			cancelled: false,
			scope: "global",
			root: os.homedir(),
		})
	})

	afterEach(() => {
		mockExit.mockClear()
		vi.resetAllMocks()
		vi.resetModules()
	})

	const mkLocalSkill = (name = "test-skill") => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{ name, isDirectory: () => true, isFile: () => false } as fs.Dirent,
		])
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce([name])
	}

	const targetMissing = () =>
		vi.mocked(fs.pathExists).mockImplementation((p: string) => {
			if (p.includes("/.agents/")) return Promise.resolve(false)
			return Promise.resolve(true)
		})

	it("should cancel if type is unknown", async () => {
		await add("unknown")
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Unknown type"),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should install a local skill into .agents/skills", async () => {
		mkLocalSkill()
		targetMissing()
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false) // decline hook wiring
		await add("skill")

		expect(prompts.intro).toHaveBeenCalled()
		expect(fs.copy).toHaveBeenCalledWith(
			"/mock/skills/test-skill",
			"/mock/home/.agents/skills/test-skill",
			{ overwrite: true },
		)
		expect(prompts.outro).toHaveBeenCalled()
	})

	it("should install a local agent .md into .agents/agents", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "my-agent.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		])
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce([
			"my-agent.md",
		])
		targetMissing()
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false)

		await add("agent")

		expect(fs.copy).toHaveBeenCalledWith(
			"/mock/agents/my-agent.md",
			"/mock/home/.agents/agents/my-agent.md",
			{ overwrite: true },
		)
	})

	it("should install a workflow into .agents/commands", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "flow.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		])
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce([
			"flow.md",
		])
		targetMissing()
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false)

		await add("workflow")

		expect(fs.copy).toHaveBeenCalledWith(
			"/mock/workflows/flow.md",
			"/mock/home/.agents/commands/flow.md",
			{ overwrite: true },
		)
	})

	it("should handle GitHub fetch and installation for a directory (tree)", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill"
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill",
			isFile: false,
		})
		targetMissing()
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false)

		await add("skill", mockUrl)

		expect(fetchSkillFromGitHub).toHaveBeenCalledWith(mockUrl)
		expect(fs.copy).toHaveBeenCalledWith(
			"/tmp/skill",
			expect.stringContaining(".agents/skills/skill"),
			{ overwrite: true },
		)
		expect(fs.remove).toHaveBeenCalledWith("/tmp/skill")
	})

	it("should handle GitHub fetch and installation for a single file (blob)", async () => {
		const mockUrl =
			"https://github.com/owner/repo/blob/main/skills/skill-name.md"
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/skill-name.md",
			skillName: "skill-name.md",
			isFile: true,
		})
		targetMissing()
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false)

		await add("skill", mockUrl)

		expect(fetchSkillFromGitHub).toHaveBeenCalledWith(mockUrl)
		expect(fs.copy).toHaveBeenCalledWith(
			"/tmp/skill-name.md/skill-name.md",
			expect.stringContaining(".agents/skills/skill-name"),
			{ overwrite: true },
		)
		expect(fs.remove).toHaveBeenCalledWith("/tmp/skill-name.md")
	})

	it("should handle GitHub fetch failure", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill"
		vi.mocked(fetchSkillFromGitHub).mockRejectedValue(
			new Error("Network error"),
		)

		await add("skill", mockUrl)

		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Network error"),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should handle no items found in directory", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValue([])

		await add("skill")

		expect(prompts.note).toHaveBeenCalledWith(
			expect.stringContaining("No skills found in directory."),
			"Information",
		)
	})

	it("should sort available items", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValue([
			{ name: "b-item", isDirectory: () => true, isFile: () => false },
			{ name: "a-item", isDirectory: () => true, isFile: () => false },
		] as unknown as fs.Dirent<string>[])
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(["a-item"])
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false)

		await add("skill")

		expect(prompts.autocompleteMultiselect).toHaveBeenCalledWith(
			expect.objectContaining({
				options: [
					{ label: "a-item", value: "a-item" },
					{ label: "b-item", value: "b-item" },
				],
			}),
		)
	})

	it("should support interactive loop starting from no type", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		mkLocalSkill("skill1")
		targetMissing()
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false)

		await add()

		expect(prompts.select).toHaveBeenCalledWith(
			expect.objectContaining({ message: "What would you like to add?" }),
		)
		expect(fs.copy).toHaveBeenCalled()
	})

	it("should skip intro and outro if skipIntro option is true", async () => {
		await add("skill", undefined, { skipIntro: true })
		expect(prompts.intro).not.toHaveBeenCalled()
		expect(prompts.outro).not.toHaveBeenCalled()
	})

	it("should handle error in loop gracefully", async () => {
		vi.mocked(prompts.select).mockResolvedValueOnce("skill")
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockRejectedValue(
			new Error("Loop crash"),
		)

		await add()
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Loop crash"),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should return early if local selection is cancelled", async () => {
		mkLocalSkill()
		vi.mocked(prompts.autocompleteMultiselect)
			.mockReset()
			.mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockReturnValue(true)
		await add("skill")
		expect(fs.copy).not.toHaveBeenCalled()
	})

	it("should cancel if source directory not found", async () => {
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockResolvedValue(false)
		await add("skill")
		expect(prompts.cancel).toHaveBeenCalledWith("skill directory not found!")
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should throw error if item not found during installation", async () => {
		mkLocalSkill("item")
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false)
		vi.mocked(fs.pathExists).mockImplementation((p: string) => {
			if (p.includes("/mock/skills/item")) return Promise.resolve(false)
			return Promise.resolve(true)
		})

		await add("skill")
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("item: Item 'item' not found"),
		)
	})

	it("should always copy even when the target already exists in .agents", async () => {
		mkLocalSkill("item")
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false) // decline hook wiring
		await add("skill")
		expect(fs.copy).toHaveBeenCalledWith(
			"/mock/skills/item",
			"/mock/home/.agents/skills/item",
			{ overwrite: true },
		)
	})

	it("should handle non-Error exception during installation", async () => {
		mkLocalSkill("item")
		targetMissing()
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false)
		vi.mocked(fs.copy).mockRejectedValue("string error")

		await add("skill")
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("item: string error"),
		)
	})

	it("should cleanup tempDir when scope choice is cancelled with URL", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		vi.mocked(chooseInstallScope).mockResolvedValueOnce({ cancelled: true })
		await add("skill", "https://github.com/x/y/tree/main/item")
		expect(fs.copy).not.toHaveBeenCalled()
		expect(fs.remove).toHaveBeenCalledWith("/tmp/item")
	})

	it("should bail out when scope choice is cancelled", async () => {
		mkLocalSkill()
		vi.mocked(chooseInstallScope).mockResolvedValueOnce({ cancelled: true })
		await add("skill")
		expect(fs.copy).not.toHaveBeenCalled()
	})

	it("should reject when scope flag is unavailable", async () => {
		mkLocalSkill()
		vi.mocked(chooseInstallScope).mockResolvedValueOnce({
			rejected: true,
			reason: "not a git repo",
		})
		await add("skill", undefined, { scope: "project" })
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("not a git repo"),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	describe("scope handling", () => {
		it("should pass --scope flag through to chooseInstallScope", async () => {
			mkLocalSkill()
			vi.mocked(prompts.confirm).mockResolvedValue(false)
			await add("skill", undefined, { scope: "project" })
			expect(chooseInstallScope).toHaveBeenCalledWith(
				expect.objectContaining({ flag: "project" }),
			)
		})

		it("should require explicit confirm when project scope is chosen", async () => {
			mkLocalSkill()
			vi.mocked(getAgentsBase).mockReturnValue("/tmp/myrepo/.agents")
			vi.mocked(chooseInstallScope).mockResolvedValueOnce({
				cancelled: false,
				scope: "project",
				root: "/tmp/myrepo",
			})
			vi.mocked(prompts.confirm)
				.mockResolvedValueOnce(true) // project confirm
				.mockResolvedValueOnce(false) // decline hook
			await add("skill")
			expect(prompts.confirm).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining("/tmp/myrepo"),
				}),
			)
		})

		it("should bail out when project-scope confirm is declined", async () => {
			mkLocalSkill()
			vi.mocked(chooseInstallScope).mockResolvedValueOnce({
				cancelled: false,
				scope: "project",
				root: "/tmp/myrepo",
			})
			vi.mocked(prompts.confirm).mockResolvedValueOnce(false)
			await add("skill")
			expect(fs.copy).not.toHaveBeenCalled()
		})

		it("should include scope in summary note", async () => {
			mkLocalSkill()
			vi.mocked(chooseInstallScope).mockResolvedValueOnce({
				cancelled: false,
				scope: "project",
				root: "/tmp/myrepo",
			})
			vi.mocked(prompts.confirm)
				.mockResolvedValueOnce(true)
				.mockResolvedValueOnce(false)
			await add("skill")
			expect(prompts.note).toHaveBeenCalledWith(
				expect.stringContaining("scope: project"),
				"Summary",
			)
		})
	})

	describe("hook wiring", () => {
		it("should offer to wire the hook after a successful install", async () => {
			mkLocalSkill()
			targetMissing()
			await add("skill")
			expect(prompts.confirm).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "Wire the agent-setup session-start hook now?",
				}),
			)
			expect(wireAgentSetup).toHaveBeenCalledWith(
				"/mock/home/.agents",
				"global",
				os.homedir(),
				["claude-code"],
			)
		})

		it("should prompt for which agents to wire", async () => {
			mkLocalSkill()
			targetMissing()
			await add("skill")
			expect(prompts.multiselect).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "Which agents should be wired?",
					required: true,
				}),
			)
		})

		it("should bail when the agent multiselect is cancelled", async () => {
			mkLocalSkill()
			targetMissing()
			vi.mocked(prompts.multiselect).mockResolvedValueOnce(Symbol("cancel"))
			vi.mocked(prompts.isCancel)
				.mockReturnValueOnce(false) // autocomplete items
				.mockReturnValueOnce(false) // hook confirm
				.mockReturnValueOnce(true) // agent multiselect
			await add("skill")
			expect(wireAgentSetup).not.toHaveBeenCalled()
		})

		it("should overwrite conflicting entries the user selects", async () => {
			mkLocalSkill()
			targetMissing()
			vi.mocked(detectConflicts).mockResolvedValueOnce([
				{
					entry: "dup",
					subdir: "skills",
					targetPaths: ["/x/.claude/skills/dup"],
				},
			])
			vi.mocked(prompts.multiselect)
				.mockResolvedValueOnce(["claude-code"]) // agents
				.mockResolvedValueOnce(["dup"]) // overwrite selection
			await add("skill")
			expect(removeAgentDirEntries).toHaveBeenCalledWith([
				"/x/.claude/skills/dup",
			])
			expect(dropAgentsEntry).not.toHaveBeenCalled()
			expect(wireAgentSetup).toHaveBeenCalled()
		})

		it("should drop conflicting entries the user does not select", async () => {
			mkLocalSkill()
			targetMissing()
			vi.mocked(detectConflicts).mockResolvedValueOnce([
				{
					entry: "dup",
					subdir: "skills",
					targetPaths: ["/x/.claude/skills/dup"],
				},
			])
			vi.mocked(prompts.multiselect)
				.mockResolvedValueOnce(["claude-code"]) // agents
				.mockResolvedValueOnce([]) // overwrite none
			await add("skill")
			expect(dropAgentsEntry).toHaveBeenCalledWith(
				"/mock/home/.agents",
				"skills",
				"dup",
			)
			expect(removeAgentDirEntries).not.toHaveBeenCalled()
		})

		it("should include an entry pre-existing only in .agents in the prompt", async () => {
			mkLocalSkill("pre")
			vi.mocked(detectConflicts).mockResolvedValueOnce([])
			vi.mocked(prompts.multiselect)
				.mockResolvedValueOnce(["claude-code"])
				.mockResolvedValueOnce([])
			await add("skill")
			expect(prompts.multiselect).toHaveBeenCalledWith(
				expect.objectContaining({
					options: [{ label: "pre", value: "pre" }],
				}),
			)
			expect(dropAgentsEntry).toHaveBeenCalledWith(
				"/mock/home/.agents",
				"skills",
				"pre",
			)
			expect(removeAgentDirEntries).not.toHaveBeenCalled()
		})

		it("should overwrite an entry conflicting in both .agents and a platform dir", async () => {
			mkLocalSkill("dup")
			// preExisting in .agents (pathExists default true) AND platform conflict
			vi.mocked(detectConflicts).mockResolvedValueOnce([
				{
					entry: "dup",
					subdir: "skills",
					targetPaths: ["/x/.claude/skills/dup"],
				},
			])
			vi.mocked(prompts.multiselect)
				.mockResolvedValueOnce(["claude-code"])
				.mockResolvedValueOnce(["dup"])
			await add("skill")
			expect(prompts.multiselect).toHaveBeenCalledWith(
				expect.objectContaining({
					options: [{ label: "dup", value: "dup" }],
				}),
			)
			expect(removeAgentDirEntries).toHaveBeenCalledWith([
				"/x/.claude/skills/dup",
			])
			expect(dropAgentsEntry).not.toHaveBeenCalled()
		})

		it("should not prompt when there are no conflicts", async () => {
			mkLocalSkill()
			targetMissing()
			vi.mocked(detectConflicts).mockResolvedValueOnce([])
			await add("skill")
			expect(prompts.multiselect).toHaveBeenCalledTimes(1)
			expect(wireAgentSetup).toHaveBeenCalled()
		})

		it("should bail when the conflict multiselect is cancelled", async () => {
			mkLocalSkill()
			targetMissing()
			vi.mocked(detectConflicts).mockResolvedValueOnce([
				{ entry: "dup", subdir: "skills", targetPaths: ["/x/dup"] },
			])
			vi.mocked(prompts.multiselect)
				.mockResolvedValueOnce(["claude-code"]) // agents
				.mockResolvedValueOnce(Symbol("cancel")) // overwrite cancelled
			vi.mocked(prompts.isCancel)
				.mockReturnValueOnce(false) // autocomplete items
				.mockReturnValueOnce(false) // hook confirm
				.mockReturnValueOnce(false) // agent multiselect
				.mockReturnValueOnce(true) // conflict multiselect
			await add("skill")
			expect(wireAgentSetup).not.toHaveBeenCalled()
		})

		it("should not wire the hook when declined", async () => {
			mkLocalSkill()
			vi.mocked(prompts.confirm).mockResolvedValueOnce(false)
			await add("skill")
			expect(wireAgentSetup).not.toHaveBeenCalled()
		})

		it("should not wire the hook when wiring confirm is cancelled", async () => {
			mkLocalSkill()
			vi.mocked(prompts.confirm).mockResolvedValueOnce(Symbol("cancel"))
			vi.mocked(prompts.isCancel)
				.mockReturnValueOnce(false) // autocomplete items
				.mockReturnValueOnce(true) // hook confirm
			await add("skill")
			expect(wireAgentSetup).not.toHaveBeenCalled()
		})

		it("should not offer wiring when nothing was installed", async () => {
			mkLocalSkill("item")
			targetMissing()
			vi.mocked(fs.copy).mockRejectedValue(new Error("Disk full"))
			await add("skill")
			expect(wireAgentSetup).not.toHaveBeenCalled()
		})

		it("should surface wiring errors without crashing", async () => {
			mkLocalSkill()
			targetMissing()
			vi.mocked(wireAgentSetup).mockRejectedValueOnce(new Error("wire boom"))
			await add("skill")
			expect(prompts.outro).toHaveBeenCalled()
		})
	})
})
