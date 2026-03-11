import * as prompts from "@clack/prompts"
import fs from "fs-extra"
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest"
import { getTargetPaths, PLATFORM_LABELS } from "../../utils/paths.js"
import { remove } from "../remove.js"

vi.mock("fs-extra")
vi.mock("@clack/prompts")
vi.mock("../../utils/paths.js")

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
		})
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "item1", isDirectory: () => true, isFile: () => false },
		] as never)

		vi.mocked(getTargetPaths).mockReturnValue({
			gemini: "/mock/install/gemini",
		})
		vi.mocked(PLATFORM_LABELS).gemini = "Gemini CLI"

		vi.mocked(prompts.multiselect).mockResolvedValue(["item1"])
		vi.mocked(prompts.confirm).mockResolvedValue(true)
		vi.mocked(prompts.select).mockResolvedValue("exit")
	})

	it("should return if no items are found", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([] as never)
		await remove("skill")
		expect(prompts.outro).toHaveBeenCalledWith("Done!")
	})

	it("should handle item selection and removal", async () => {
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"]) // Items
			.mockResolvedValueOnce(["gemini"]) // Platforms

		await remove("skill")

		expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining("item1"))
	})

	it("should return on cancel during item selection", async () => {
		vi.mocked(prompts.multiselect).mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockReturnValueOnce(true)

		await remove("skill")
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("should return on cancel during platform selection", async () => {
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel)
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true)

		await remove("skill")
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("should handle items not found on specific platforms", async () => {
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["gemini"])

		vi.mocked(fs.pathExists).mockResolvedValueOnce(true as never) // scanning
		vi.mocked(fs.pathExists).mockResolvedValueOnce(false as never) // removal check

		await remove("skill")
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("should handle removal errors (Error object)", async () => {
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(fs.remove).mockRejectedValue(new Error("Delete failed") as never)

		await remove("skill")
		expect(mockConsoleError).toHaveBeenCalled()
	})

	it("should handle removal errors (string error)", async () => {
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(fs.remove).mockRejectedValue("Delete failed string" as never)

		await remove("skill")
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Delete failed string"),
		)
	})

	it("should filter items correctly for agents/workflows and cover all branch parts", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "agent.md", isDirectory: () => false, isFile: () => true },
			{ name: "not-md.txt", isDirectory: () => false, isFile: () => true },
			{ name: "sub-dir", isDirectory: () => true, isFile: () => false },
			{ name: "not-file", isDirectory: () => false, isFile: () => false },
		] as never)

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["agent.md", "sub-dir"])
			.mockResolvedValueOnce(["gemini"])

		await remove("agent")
		expect(prompts.multiselect).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.arrayContaining([
					{ value: "agent.md", label: "agent.md" },
					{ value: "sub-dir", label: "sub-dir" },
				]),
			}),
		)
	})

	it("should normalize plural type", async () => {
		await remove("skills")
		expect(prompts.intro).toHaveBeenCalledWith(
			expect.stringContaining(" AI Manager : Remove "),
		)
	})

	it("should support interactive loop starting from no type", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill") // First iteration: pick skill
			.mockResolvedValueOnce("exit") // Second iteration: exit

		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{ name: "item1", isDirectory: () => true, isFile: () => false },
		] as never)

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"]) // Select item
			.mockResolvedValueOnce(["gemini"]) // Select platform

		await remove()

		expect(prompts.select).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "What would you like to remove?",
			}),
		)
		expect(fs.remove).toHaveBeenCalled()
	})

	it("should skip intro and outro if skipIntro option is true", async () => {
		await remove("skill", { skipIntro: true })
		expect(prompts.intro).not.toHaveBeenCalled()
		expect(prompts.outro).not.toHaveBeenCalled()
	})

	it("should handle error during deletion", async () => {
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(fs.remove).mockRejectedValueOnce(new Error("Delete failed"))
		await remove("skill")
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Errors encountered"),
		)
	})

	it("should break loop if single shot and cancelled", async () => {
		vi.mocked(prompts.multiselect).mockResolvedValue(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockReturnValue(true)
		await remove("skill")
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("should handle interactive cancellation of item selection", async () => {
		vi.mocked(prompts.select).mockResolvedValueOnce("skill")
		vi.mocked(prompts.multiselect).mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel)
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true)
		vi.mocked(prompts.select).mockResolvedValueOnce("exit") // loop back

		await remove()
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("should handle declining delete confirmation", async () => {
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false)
		await remove("skill")
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("should handle cancel during delete confirmation", async () => {
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(prompts.confirm).mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockImplementation((v) => typeof v === "symbol")
		await remove("skill")
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("should handle no items found in interactive mode", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		vi.mocked(fs.readdir).mockResolvedValue([] as never)

		await remove()
		expect(prompts.note).toHaveBeenCalledWith(
			expect.stringContaining("No installed skills found."),
			"Information",
		)
	})

	it("should handle cancel during platform selection in interactive mode", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"]) // Items
			.mockResolvedValueOnce(Symbol("cancel")) // Platforms

		vi.mocked(prompts.isCancel)
			.mockReturnValueOnce(false) // item selection not cancelled
			.mockReturnValueOnce(true) // platform selection cancelled

		await remove()
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("should handle cancel during confirmation in interactive mode", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"]) // Items
			.mockResolvedValueOnce(["gemini"]) // Platforms
		vi.mocked(prompts.confirm).mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel)
			.mockReturnValueOnce(false) // item
			.mockReturnValueOnce(false) // platform
			.mockReturnValueOnce(true) // confirm

		await remove()
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("should handle declining confirmation in interactive mode", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"]) // Items
			.mockResolvedValueOnce(["gemini"]) // Platforms
		vi.mocked(prompts.confirm).mockResolvedValueOnce(false)
		vi.mocked(prompts.isCancel).mockReturnValue(false)

		await remove()
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("should handle some paths not existing during scan", async () => {
		vi.mocked(getTargetPaths).mockReturnValueOnce({
			gemini: "/mock/install/gemini",
			copilot: "/mock/install/copilot",
		})
		vi.mocked(fs.pathExists).mockResolvedValueOnce(true as never) // gemini exists
		vi.mocked(fs.pathExists).mockResolvedValueOnce(false as never) // copilot doesn't exist

		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{ name: "item1", isDirectory: () => true, isFile: () => false },
		] as never)

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["gemini"])

		await remove("skill")
		expect(fs.readdir).toHaveBeenCalledTimes(1) // Only called for gemini
	})

	it("should handle workflow type correctly", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "workflow.md", isDirectory: () => false, isFile: () => true },
		] as never)

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["workflow.md"])
			.mockResolvedValueOnce(["gemini"])

		await remove("workflow")
		expect(prompts.multiselect).toHaveBeenCalledWith(
			expect.objectContaining({
				options: [{ value: "workflow.md", label: "workflow.md" }],
			}),
		)
	})

	it("should continue if targetBase is missing (sanity check)", async () => {
		vi.mocked(getTargetPaths).mockReturnValueOnce({
			gemini: "/mock/install/gemini",
		})
		// We mock multiselect to return a platform that is NOT gemini
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["nonexistent" as unknown as string])

		await remove("skill")
		expect(fs.remove).not.toHaveBeenCalled()
	})

	it("should remove Codex converted directories", async () => {
		vi.mocked(getTargetPaths).mockReturnValueOnce({
			codex: "/mock/install/codex",
		})
		vi.mocked(PLATFORM_LABELS).codex = "Codex"
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "converted-agent", isDirectory: () => true, isFile: () => false },
		] as never)
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["converted-agent"])
			.mockResolvedValueOnce(["codex"])

		await remove("agent")

		expect(fs.remove).toHaveBeenCalledWith(
			"/mock/install/codex/converted-agent",
		)
	})
})
