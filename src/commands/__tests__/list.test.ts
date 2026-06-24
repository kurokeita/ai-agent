import os from "node:os"
import path from "node:path"
import * as prompts from "@clack/prompts"
import fs from "fs-extra"
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest"
import { getAgentsBase, TYPE_DIRS } from "../../utils/paths.js"
import { chooseListRemoveScope } from "../../utils/scope-prompt.js"
import { list } from "../list.js"

vi.mock("fs-extra")
vi.mock("../../utils/paths.js")
vi.mock("../../utils/scope-prompt.js")
vi.mock("@clack/prompts", () => ({
	intro: vi.fn(),
	outro: vi.fn(),
	select: vi.fn(),
	cancel: vi.fn(),
	isCancel: vi.fn(() => false),
}))

describe("src/commands/list.ts", () => {
	let mockConsoleLog: MockInstance
	let mockConsoleError: MockInstance

	beforeEach(() => {
		vi.resetAllMocks()
		mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {})
		mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {})

		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(fs.readdir).mockResolvedValue([] as never)

		vi.mocked(TYPE_DIRS).skill = "/mock/repo/skills"
		vi.mocked(TYPE_DIRS).agent = "/mock/repo/agents"
		vi.mocked(TYPE_DIRS).workflow = "/mock/repo/workflows"

		const home = os.homedir()
		vi.mocked(getAgentsBase).mockImplementation((scope, root) =>
			scope === "project"
				? path.join(root ?? "/proj", ".agents")
				: path.join(home, ".agents"),
		)

		vi.mocked(prompts.select).mockResolvedValue("exit")

		vi.mocked(chooseListRemoveScope).mockResolvedValue({
			cancelled: false,
			scope: "global",
			homedir: home,
		})
	})

	it("lists repository items for a specific type and handles plural", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "item1", isDirectory: () => true, isFile: () => false },
		] as never)
		await list("skills")
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Available skills"),
		)
	})

	it("prompts for a type when none is provided", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "skill1", isDirectory: () => true, isFile: () => false },
		] as never)

		await list()

		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Available skills"),
		)
	})

	it("handles unknown type", async () => {
		await list("unknown")
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Unknown type: unknown"),
		)
	})

	it("handles missing repository directory", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(false as never)
		await list("skill")
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("No skill directory found"),
		)
	})

	it("handles no repository items found", async () => {
		await list("skill")
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("No skills found"),
		)
	})

	it("filters repository items by type", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "dir", isDirectory: () => true, isFile: () => false },
			{ name: "file.md", isDirectory: () => false, isFile: () => true },
			{ name: "other.txt", isDirectory: () => false, isFile: () => false },
		] as never)

		await list("skill")
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("- dir"),
		)
		expect(mockConsoleLog).not.toHaveBeenCalledWith(
			expect.stringContaining("- file.md"),
		)

		mockConsoleLog.mockClear()
		await list("agent")
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("- dir"),
		)
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("- file.md"),
		)
	})

	it("lists all repository types", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "item1", isDirectory: () => true, isFile: () => false },
		] as never)
		await list("all")
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Available skills"),
		)
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Available agents"),
		)
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Available workflows"),
		)
	})

	it("handles errors during listing", async () => {
		vi.mocked(fs.readdir).mockRejectedValue(new Error("Disk failure") as never)
		await list("skill")
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Error listing items:"),
			expect.any(Error),
		)
	})

	it("toggles between Repository and Local view", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("toggle")
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "local-skill", isDirectory: () => true, isFile: () => false },
		] as never)

		await list()

		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Installed skills (Local)"),
		)
	})

	it("skips intro and outro when skipIntro is set", async () => {
		await list("skill", { skipIntro: true })
		expect(prompts.intro).not.toHaveBeenCalled()
		expect(prompts.outro).not.toHaveBeenCalled()
	})

	describe("local listing from .agents", () => {
		it("lists entries from the canonical .agents subdir", async () => {
			vi.mocked(fs.readdir).mockResolvedValue([
				{
					name: "installed-item",
					isDirectory: () => true,
					isFile: () => false,
				},
				{ name: "installed.md", isDirectory: () => false, isFile: () => true },
			] as never)

			await list("skill", { local: true })

			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("Installed skills (Local)"),
			)
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("- installed-item"),
			)
			const skillsDir = path.join(os.homedir(), ".agents", "skills")
			expect(fs.readdir).toHaveBeenCalledWith(skillsDir, expect.anything())
		})

		it("reports nothing when the subdir is empty", async () => {
			vi.mocked(fs.readdir).mockResolvedValue([] as never)
			await list("skill", { local: true })
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("No installed skills found"),
			)
		})

		it("reports nothing when the subdir is absent", async () => {
			vi.mocked(fs.pathExists).mockResolvedValue(false as never)
			await list("skill", { local: true })
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringContaining("No installed skills found"),
			)
		})

		it("maps agent type to the agents subdir", async () => {
			vi.mocked(fs.readdir).mockResolvedValue([
				{ name: "an-agent", isDirectory: () => true, isFile: () => false },
			] as never)
			await list("agent", { local: true })
			const agentsDir = path.join(os.homedir(), ".agents", "agents")
			expect(fs.readdir).toHaveBeenCalledWith(agentsDir, expect.anything())
		})

		it("maps workflow type to the commands subdir", async () => {
			vi.mocked(fs.readdir).mockResolvedValue([
				{ name: "a-command.md", isDirectory: () => false, isFile: () => true },
			] as never)
			await list("workflow", { local: true })
			const commandsDir = path.join(os.homedir(), ".agents", "commands")
			expect(fs.readdir).toHaveBeenCalledWith(commandsDir, expect.anything())
		})

		it("calls chooseListRemoveScope for local listings", async () => {
			await list("skill", { local: true })
			expect(chooseListRemoveScope).toHaveBeenCalledWith(
				expect.objectContaining({ action: "list" }),
			)
		})

		it("does not call chooseListRemoveScope for repository view", async () => {
			await list("skill")
			expect(chooseListRemoveScope).not.toHaveBeenCalled()
		})

		it("passes the --scope flag through", async () => {
			await list("skill", { local: true, scope: "both" })
			expect(chooseListRemoveScope).toHaveBeenCalledWith(
				expect.objectContaining({ action: "list", flag: "both" }),
			)
		})

		it("exits the process when the scope choice is rejected", async () => {
			const mockExit = vi
				.spyOn(process, "exit")
				.mockImplementation(() => undefined as never)
			vi.mocked(chooseListRemoveScope).mockResolvedValueOnce({
				rejected: true,
				reason: "outside repo",
			})
			await list("skill", { local: true, scope: "project" })
			expect(prompts.cancel).toHaveBeenCalled()
			expect(mockExit).toHaveBeenCalledWith(1)
		})

		it("bails gracefully when the scope choice is cancelled", async () => {
			vi.mocked(chooseListRemoveScope).mockResolvedValueOnce({
				cancelled: true,
			})
			await list("skill", { local: true })
			expect(mockConsoleLog).not.toHaveBeenCalledWith(
				expect.stringContaining("- "),
			)
		})

		it("renders Global and Project sections when scope=both", async () => {
			vi.mocked(chooseListRemoveScope).mockResolvedValueOnce({
				cancelled: false,
				scope: "both",
				homedir: "/home/me",
				projectRoot: "/home/me/dev/myrepo",
			})
			vi.mocked(getAgentsBase).mockImplementation((scope, root) =>
				scope === "project"
					? path.join(root ?? "/proj", ".agents")
					: "/home/me/.agents",
			)
			vi.mocked(fs.readdir).mockResolvedValue([
				{ name: "an-item", isDirectory: () => true, isFile: () => false },
			] as never)

			await list("skill", { local: true })
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringMatching(/Global \(.+\):/),
			)
			expect(mockConsoleLog).toHaveBeenCalledWith(
				expect.stringMatching(/Project \(.+\):/),
			)
		})
	})
})
