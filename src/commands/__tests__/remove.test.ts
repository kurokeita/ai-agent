import os from "node:os"
import path from "node:path"
import * as prompts from "@clack/prompts"
import fs from "fs-extra"
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest"
import {
	getAgentsBase,
	getProjectPlatformPathsSkills,
	PLATFORM_PATHS_SKILLS,
} from "../../utils/paths.js"
import { chooseListRemoveScope } from "../../utils/scope-prompt.js"
import { remove } from "../remove.js"

vi.mock("fs-extra")
vi.mock("@clack/prompts")
vi.mock("../../utils/paths.js")
vi.mock("../../utils/scope-prompt.js")
vi.mock("../../utils/prompts.js", () => ({
	enableAutocompleteMultiSelectShiftAToggle: vi.fn(),
}))

describe("src/commands/remove.ts", () => {
	let _mockExit: MockInstance
	let mockConsoleError: MockInstance

	beforeEach(() => {
		vi.resetAllMocks()
		_mockExit = vi
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
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "item1", isDirectory: () => true, isFile: () => false },
		] as never)
		vi.mocked(fs.lstat).mockResolvedValue({
			isSymbolicLink: () => false,
		} as never)

		const home = os.homedir()
		vi.mocked(getAgentsBase).mockImplementation((scope, root) =>
			scope === "project"
				? path.join(root ?? "/proj", ".agents")
				: path.join(home, ".agents"),
		)
		vi.mocked(PLATFORM_PATHS_SKILLS).gemini = "/global/.gemini/skills"
		vi.mocked(getProjectPlatformPathsSkills).mockReturnValue({
			gemini: "/proj/.gemini/skills",
		} as never)

		vi.mocked(prompts.confirm).mockResolvedValue(true)
		vi.mocked(prompts.select).mockResolvedValue("exit")

		vi.mocked(chooseListRemoveScope).mockResolvedValue({
			cancelled: false,
			scope: "global",
			homedir: home,
		})
	})

	it("returns if no items are found", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([] as never)
		await remove("skill")
		expect(prompts.note).toHaveBeenCalledWith(
			expect.stringContaining("No installed skills found."),
			"Information",
		)
	})

	it("removes the selected entry from the canonical .agents path", async () => {
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(["item1"])

		await remove("skill")

		const expected = path.join(os.homedir(), ".agents", "skills", "item1")
		expect(fs.remove).toHaveBeenCalledWith(expected)
	})

	it("maps workflow type to the commands subdir", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "wf.md", isDirectory: () => false, isFile: () => true },
		] as never)
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(["wf.md"])

		await remove("workflow")

		const expected = path.join(os.homedir(), ".agents", "commands", "wf.md")
		expect(fs.remove).toHaveBeenCalledWith(expected)
	})

	it("prunes a dangling platform symlink that points at the removed entry", async () => {
		const agentsPath = path.join(os.homedir(), ".agents", "skills", "item1")
		const link = "/global/.gemini/skills/item1"
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(["item1"])
		vi.mocked(fs.lstat).mockImplementation((p) =>
			Promise.resolve({
				isSymbolicLink: () => p === link,
			} as never),
		)
		vi.mocked(fs.realpath).mockResolvedValue(agentsPath as never)

		await remove("skill")

		expect(fs.remove).toHaveBeenCalledWith(link)
	})

	it("does not prune a non-symlink platform entry", async () => {
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(["item1"])
		vi.mocked(fs.lstat).mockResolvedValue({
			isSymbolicLink: () => false,
		} as never)

		await remove("skill")

		expect(fs.remove).not.toHaveBeenCalledWith("/global/.gemini/skills/item1")
	})

	it("returns on cancel during item selection", async () => {
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(
			Symbol("cancel"),
		)
		vi.mocked(prompts.isCancel).mockReturnValueOnce(true)

		await remove("skill")
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("declining confirmation skips removal", async () => {
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(["item1"])
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false)
		await remove("skill")
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("cancelling confirmation skips removal", async () => {
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(["item1"])
		vi.mocked(prompts.confirm).mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockImplementation((v) => typeof v === "symbol")
		await remove("skill")
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("reports not-found when the entry path is absent at deletion", async () => {
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(["item1"])
		vi.mocked(fs.pathExists).mockImplementation((p) =>
			Promise.resolve(!String(p).endsWith(path.join("skills", "item1"))),
		)
		await remove("skill")
		expect(fs.remove).not.toHaveBeenCalledWith(
			path.join(os.homedir(), ".agents", "skills", "item1"),
		)
	})

	it("reports removal errors", async () => {
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(["item1"])
		vi.mocked(fs.remove).mockRejectedValueOnce(new Error("Delete failed"))
		await remove("skill")
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Errors encountered"),
		)
	})

	it("reports string removal errors", async () => {
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(["item1"])
		vi.mocked(fs.remove).mockRejectedValueOnce("boom" as never)
		await remove("skill")
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("boom"),
		)
	})

	it("normalizes a plural type", async () => {
		await remove("skills")
		expect(prompts.intro).toHaveBeenCalledWith(
			expect.stringContaining(" AI Manager : Remove "),
		)
	})

	it("supports the interactive loop starting from no type", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{ name: "item1", isDirectory: () => true, isFile: () => false },
		] as never)
		vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce(["item1"])

		await remove()

		expect(prompts.select).toHaveBeenCalledWith(
			expect.objectContaining({ message: "What would you like to remove?" }),
		)
		expect(fs.remove).toHaveBeenCalled()
	})

	it("skips intro and outro when skipIntro is set", async () => {
		await remove("skill", { skipIntro: true })
		expect(prompts.intro).not.toHaveBeenCalled()
		expect(prompts.outro).not.toHaveBeenCalled()
	})

	describe("scope handling", () => {
		it("calls chooseListRemoveScope before scanning", async () => {
			await remove("skill")
			expect(chooseListRemoveScope).toHaveBeenCalledWith(
				expect.objectContaining({ action: "remove" }),
			)
		})

		it("passes the --scope flag through", async () => {
			await remove("skill", { scope: "both" })
			expect(chooseListRemoveScope).toHaveBeenCalledWith(
				expect.objectContaining({ action: "remove", flag: "both" }),
			)
		})

		it("exits when the scope choice is rejected", async () => {
			vi.mocked(chooseListRemoveScope).mockResolvedValueOnce({
				rejected: true,
				reason: "outside repo",
			})
			await remove("skill", { scope: "project" })
			expect(_mockExit).toHaveBeenCalledWith(1)
		})

		it("bails when the scope choice is cancelled", async () => {
			vi.mocked(chooseListRemoveScope).mockResolvedValueOnce({
				cancelled: true,
			})
			await remove("skill")
			expect(fs.remove).not.toHaveBeenCalled()
		})

		it("scopes removal to the project .agents for project scope", async () => {
			vi.mocked(chooseListRemoveScope).mockResolvedValueOnce({
				cancelled: false,
				scope: "project",
				homedir: "/home/me",
				projectRoot: "/home/me/dev/myrepo",
			})
			vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce([
				"item1",
			])

			await remove("skill")

			expect(fs.remove).toHaveBeenCalledWith(
				path.join("/home/me/dev/myrepo", ".agents", "skills", "item1"),
			)
		})

		it("prefixes labels with [global]/[project] when scope=both", async () => {
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
				{ name: "item1", isDirectory: () => true, isFile: () => false },
			] as never)
			vi.mocked(prompts.autocompleteMultiselect).mockResolvedValueOnce([
				"global:item1",
			])

			await remove("skill")

			expect(prompts.autocompleteMultiselect).toHaveBeenCalledWith(
				expect.objectContaining({
					options: expect.arrayContaining([
						{ value: "global:item1", label: "[global] item1" },
						{ value: "project:item1", label: "[project] item1" },
					]),
				}),
			)
			expect(fs.remove).toHaveBeenCalledWith("/home/me/.agents/skills/item1")
			expect(fs.remove).not.toHaveBeenCalledWith(
				path.join("/home/me/dev/myrepo", ".agents", "skills", "item1"),
			)
		})
	})
})
