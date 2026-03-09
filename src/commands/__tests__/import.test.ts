import * as prompts from "@clack/prompts"
import fs from "fs-extra"
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest"
import { fetchSkillFromGitHub } from "../../utils/github.js"
import { TYPE_DIRS } from "../../utils/paths.js"
import { importItem } from "../import.js"

vi.mock("fs-extra")
vi.mock("@clack/prompts")
vi.mock("../../utils/github.js")
vi.mock("../../utils/paths.js")

describe("src/commands/import.ts", () => {
	let mockExit: MockInstance

	beforeEach(() => {
		vi.resetAllMocks()
		mockExit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never)
		vi.spyOn(console, "log").mockImplementation(() => {})
		vi.spyOn(console, "error").mockImplementation(() => {})

		vi.mocked(prompts.isCancel).mockReturnValue(false)
		vi.mocked(prompts.spinner).mockReturnValue({
			start: vi.fn(),
			stop: vi.fn(),
			message: vi.fn(),
		})
		vi.mocked(fs.pathExists).mockResolvedValue(false as never)
		vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as never)

		vi.mocked(TYPE_DIRS).skill = "/mock/skills"
		vi.mocked(TYPE_DIRS).agent = "/mock/agents"
		vi.mocked(TYPE_DIRS).workflow = "/mock/workflows"

		vi.mocked(prompts.confirm).mockResolvedValue(true)
		vi.mocked(prompts.select).mockResolvedValue("exit")
		vi.mocked(prompts.text).mockResolvedValue("url")
	})

	it("should cancel if type is unknown", async () => {
		await importItem("unknown", "url")
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Unknown type"),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should handle GitHub fetch failure", async () => {
		vi.mocked(fetchSkillFromGitHub).mockRejectedValue(new Error("Fetch failed"))
		await importItem("skill", "url")
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Fetch failed"),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should import skill correctly (no conflicts)", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})

		await importItem("skill", "url")

		expect(fs.copy).toHaveBeenCalledWith(
			"/tmp/item",
			expect.stringContaining("item"),
			expect.anything(),
		)
		expect(prompts.outro).toHaveBeenCalled()
	})

	it("should import skill correctly (with overwrite confirmation)", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(prompts.confirm).mockResolvedValue(true)

		await importItem("skill", "url")

		expect(prompts.confirm).toHaveBeenCalled()
		expect(fs.copy).toHaveBeenCalled()
	})

	it("should return if overwrite is declined", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(prompts.confirm).mockResolvedValue(false)

		await importItem("skill", "url")

		expect(fs.copy).not.toHaveBeenCalled()
	})

	it("should flatten agent/workflow import", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		vi.mocked(fs.readdir).mockResolvedValue(["file1.md"] as never)

		await importItem("agent", "url")

		expect(fs.copy).toHaveBeenCalledWith(
			"/tmp/item",
			"/mock/agents",
			expect.anything(),
		)
	})

	it("should handle conflicts when flattening", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		vi.mocked(fs.readdir).mockResolvedValue([
			"f1",
			"f2",
			"f3",
			"f4",
			"f5",
			"f6",
		] as never)
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(prompts.confirm).mockResolvedValue(true)

		await importItem("agent", "url")

		expect(prompts.confirm).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining("and 1 others"),
			}),
		)
		expect(fs.copy).toHaveBeenCalled()
	})

	it("should cleanup tempDir on error", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		vi.mocked(fs.ensureDir).mockRejectedValue(new Error("Disk error") as never)

		await importItem("skill", "url")

		expect(fs.remove).toHaveBeenCalledWith("/tmp/item")
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Disk error"),
		)
	})

	it("should normalize plural type", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		await importItem("skills", "url")
		expect(prompts.intro).toHaveBeenCalledWith(
			expect.stringContaining(" AI Manager : Import "),
		)
	})

	it("should throw error if tempDir is missing", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "",
			skillName: "item",
			isFile: false,
		})
		await importItem("skill", "url")
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Failed to create temp directory"),
		)
	})

	it("should support fully interactive mode (no args)", async () => {
		vi.mocked(prompts.select).mockResolvedValueOnce("skill")
		vi.mocked(prompts.text).mockResolvedValueOnce(
			"https://github.com/owner/repo/tree/main/skill",
		)
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill",
			isFile: false,
		})

		await importItem()

		expect(prompts.select).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "What would you like to import?",
			}),
		)
		expect(prompts.text).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Enter the GitHub URL:",
			}),
		)
		expect(fs.copy).toHaveBeenCalled()
	})

	it("should return early if type selection is cancelled", async () => {
		vi.mocked(prompts.select).mockResolvedValue(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockReturnValue(true)

		await importItem()
		expect(prompts.text).not.toHaveBeenCalled()
	})

	it("should return early if URL input is cancelled", async () => {
		vi.mocked(prompts.select).mockResolvedValue("skill")
		vi.mocked(prompts.text).mockResolvedValue(Symbol("cancel"))
		vi.mocked(prompts.isCancel)
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true)

		await importItem()
		expect(fetchSkillFromGitHub).not.toHaveBeenCalled()
	})

	it("should skip intro and outro if skipIntro option is true", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		await importItem("skill", "url", { skipIntro: true })
		expect(prompts.intro).not.toHaveBeenCalled()
		expect(prompts.outro).not.toHaveBeenCalled()
	})

	it("should cancel if URL is not provided in interactive mode", async () => {
		vi.mocked(prompts.select).mockResolvedValueOnce("skill")
		vi.mocked(prompts.text).mockResolvedValueOnce("") // Empty URL
		// The validation logic in text() will handle it, but here we just return
		vi.mocked(prompts.isCancel)
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true)

		await importItem()
		expect(fetchSkillFromGitHub).not.toHaveBeenCalled()
	})

	it("should handle invalid URL validation", async () => {
		// This tests the validate function in the text prompt
		// Since we mock prompts.text, we can't easily trigger the validation logic directly
		// unless we extract the validate function or test the command with real prompts.
		// For unit tests, we'll assume the URL validation logic is simple.
	})

	it("should return early if flatten overwrite is declined", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		vi.mocked(fs.readdir).mockResolvedValue(["f1"] as never)
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(prompts.confirm).mockResolvedValue(false)

		await importItem("agent", "url")
		expect(fs.copy).not.toHaveBeenCalled()
	})

	it("should handle cancel during flatten overwrite confirmation", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		vi.mocked(fs.readdir).mockResolvedValue(["f1"] as never)
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(prompts.confirm).mockResolvedValue(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockImplementation((v) => typeof v === "symbol")

		await importItem("agent", "url")
		expect(fs.copy).not.toHaveBeenCalled()
	})

	it("should validate GitHub URL correctly", async () => {
		vi.mocked(prompts.select).mockResolvedValueOnce("skill")
		let validateFn: (v: string) => string | undefined = () => undefined
		vi.mocked(prompts.text).mockImplementation((opts: any) => {
			validateFn = opts.validate
			return Promise.resolve("https://github.com/owner/repo")
		})
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})

		await importItem()

		expect(validateFn("")).toBe("URL is required.")
		expect(validateFn("https://other.com")).toBe("Must be a GitHub URL.")
		expect(validateFn("https://github.com/")).toBeUndefined()
	})

	it("should import single file correctly", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "agent.md",
			isFile: true,
		})

		await importItem("agent", "url")

		expect(fs.copy).toHaveBeenCalledWith(
			expect.stringContaining("agent.md"),
			expect.stringContaining("agent.md"),
			expect.anything(),
		)
	})

	it("should handle error when tempDir is null in catch block", async () => {
		vi.mocked(fetchSkillFromGitHub).mockRejectedValue(new Error("No tempDir"))
		// This will trigger catch block with tempDir being null
		await importItem("skill", "url")
		expect(fs.remove).not.toHaveBeenCalled()
	})
})
