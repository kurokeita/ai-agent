import * as prompts from "@clack/prompts"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Define mocks before anything else
vi.mock("../../src/commands/add.js")
vi.mock("../../src/commands/import.js")
vi.mock("../../src/commands/list.js")
vi.mock("../../src/commands/remove.js")
vi.mock("@clack/prompts", () => ({
	intro: vi.fn(),
	outro: vi.fn(),
	select: vi.fn(),
	isCancel: vi.fn(() => false),
}))

describe("bin/cli.ts", () => {
	beforeEach(async () => {
		vi.resetAllMocks()
		// Mock process.argv
		process.argv = ["node", "cli.js"]
		vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
		// Clear module cache to re-run the script
		vi.resetModules()
	})

	it("should call list command", async () => {
		const listCmd = await import("../../src/commands/list.js")
		process.argv = ["node", "cli.js", "list", "skill", "--local"]
		await import("../cli.js")
		expect(listCmd.list).toHaveBeenCalledWith("skill", {
			local: true,
			scope: undefined,
		})
	})

	it("should pass --scope flag to list command", async () => {
		const listCmd = await import("../../src/commands/list.js")
		process.argv = [
			"node",
			"cli.js",
			"list",
			"skill",
			"--local",
			"--scope",
			"both",
		]
		await import("../cli.js")
		expect(listCmd.list).toHaveBeenCalledWith("skill", {
			local: true,
			scope: "both",
		})
	})

	it("should reject invalid --scope value for list", async () => {
		const exitSpy = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never)
		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
		process.argv = ["node", "cli.js", "list", "skill", "--scope", "bogus"]
		await import("../cli.js")
		expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid"))
		expect(exitSpy).toHaveBeenCalledWith(1)
	})

	it("should call add command", async () => {
		const addCmd = await import("../../src/commands/add.js")
		process.argv = ["node", "cli.js", "add", "skill", "url"]
		await import("../cli.js")
		expect(addCmd.add).toHaveBeenCalledWith("skill", "url", {
			scope: undefined,
		})
	})

	it("should pass --scope flag to add command", async () => {
		const addCmd = await import("../../src/commands/add.js")
		process.argv = ["node", "cli.js", "add", "skill", "--scope", "project"]
		await import("../cli.js")
		expect(addCmd.add).toHaveBeenCalledWith("skill", undefined, {
			scope: "project",
		})
	})

	it("should reject invalid --scope value", async () => {
		const exitSpy = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never)
		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
		process.argv = ["node", "cli.js", "add", "skill", "--scope", "bogus"]
		await import("../cli.js")
		expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("Invalid"))
		expect(exitSpy).toHaveBeenCalledWith(1)
	})

	it("should call import command", async () => {
		const importCmd = await import("../../src/commands/import.js")
		process.argv = ["node", "cli.js", "import", "skill", "url"]
		await import("../cli.js")
		expect(importCmd.importItem).toHaveBeenCalledWith("skill", "url")
	})

	it("should call remove command", async () => {
		const removeCmd = await import("../../src/commands/remove.js")
		process.argv = ["node", "cli.js", "remove", "skill"]
		await import("../cli.js")
		expect(removeCmd.remove).toHaveBeenCalledWith("skill", {
			scope: undefined,
		})
	})

	it("should pass --scope flag to remove command", async () => {
		const removeCmd = await import("../../src/commands/remove.js")
		process.argv = ["node", "cli.js", "remove", "skill", "--scope", "project"]
		await import("../cli.js")
		expect(removeCmd.remove).toHaveBeenCalledWith("skill", {
			scope: "project",
		})
	})

	it("should call import command without arguments", async () => {
		const importCmd = await import("../../src/commands/import.js")
		process.argv = ["node", "cli.js", "import"]
		await import("../cli.js")
		expect(importCmd.importItem).toHaveBeenCalledWith("", "")
	})

	it("should call remove command without arguments", async () => {
		const removeCmd = await import("../../src/commands/remove.js")
		process.argv = ["node", "cli.js", "remove"]
		await import("../cli.js")
		expect(removeCmd.remove).toHaveBeenCalledWith("", { scope: undefined })
	})

	it("should enter interactive mode if no arguments provided", async () => {
		const addCmd = await import("../../src/commands/add.js")
		const listCmd = await import("../../src/commands/list.js")
		const importCmd = await import("../../src/commands/import.js")
		const removeCmd = await import("../../src/commands/remove.js")

		vi.mocked(prompts.select)
			.mockResolvedValueOnce("add")
			.mockResolvedValueOnce("list")
			.mockResolvedValueOnce("import")
			.mockResolvedValueOnce("remove")
			.mockResolvedValueOnce("exit")

		process.argv = ["node", "cli.js"]
		await import("../cli.js")

		expect(prompts.intro).toHaveBeenCalled()
		expect(addCmd.add).toHaveBeenCalledWith(undefined, undefined, {
			skipIntro: true,
		})
		expect(listCmd.list).toHaveBeenCalledWith(undefined, { skipIntro: true })
		expect(importCmd.importItem).toHaveBeenCalledWith(undefined, undefined, {
			skipIntro: true,
		})
		expect(removeCmd.remove).toHaveBeenCalledWith(undefined, {
			skipIntro: true,
		})
		expect(prompts.outro).toHaveBeenCalledWith("Goodbye!")
	})

	it("should exit interactive mode if cancelled", async () => {
		vi.mocked(prompts.select).mockResolvedValue(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockReturnValue(true)

		process.argv = ["node", "cli.js"]
		await import("../cli.js")

		expect(prompts.outro).toHaveBeenCalledWith("Goodbye!")
	})
})
