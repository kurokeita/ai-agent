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

	it("should handle removal errors", async () => {
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(fs.remove).mockRejectedValue(new Error("Delete failed") as never)

		await remove("skill")
		expect(mockConsoleError).toHaveBeenCalled()
	})

	it("should filter items correctly for agents/workflows", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{ name: "agent.md", isDirectory: () => false, isFile: () => true },
			{ name: "other.txt", isDirectory: () => false, isFile: () => true },
		] as never)

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["agent.md"])
			.mockResolvedValueOnce(["gemini"])

		await remove("agent")
		expect(prompts.multiselect).toHaveBeenCalledWith(
			expect.objectContaining({
				options: [{ value: "agent.md", label: "agent.md" }],
			}),
		)
	})

	it("should normalize plural type", async () => {
		await remove("skills")
		expect(prompts.intro).toHaveBeenCalledWith(
			expect.stringContaining(" AI Manager : Remove "),
		)
	})
})
