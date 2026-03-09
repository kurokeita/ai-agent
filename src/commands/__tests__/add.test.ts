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
import { fetchSkillFromGitHub } from "../../utils/github.js"
import {
	getTargetPaths,
	PLATFORM_LABELS,
	TYPE_DIRS,
} from "../../utils/paths.js"
import { add } from "../add.js"

vi.mock("fs-extra")
vi.mock("@clack/prompts")
vi.mock("../../utils/github.js")
vi.mock("../../utils/paths.js")

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
		})
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockResolvedValue(true)
		vi.mocked(fs.stat as unknown as () => Promise<fs.Stats>).mockResolvedValue({
			isFile: () => false,
		} as fs.Stats)

		vi.mocked(getTargetPaths).mockReturnValue({
			gemini: "/mock/gemini/path",
		})
		vi.mocked(PLATFORM_LABELS).gemini = "Gemini CLI"
		vi.mocked(TYPE_DIRS).skill = "/mock/skills"
		vi.mocked(TYPE_DIRS).agent = "/mock/agents"
		vi.mocked(TYPE_DIRS).workflow = "/mock/workflows"

		vi.mocked(prompts.confirm).mockResolvedValue(true)
		vi.mocked(prompts.select).mockResolvedValue("exit")
	})

	afterEach(() => {
		mockExit.mockClear()
		vi.resetAllMocks()
		vi.resetModules()
	})

	it("should cancel if type is unknown", async () => {
		await add("unknown")
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Unknown type"),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should handle local selection and installation", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValue([
			{
				name: "test-skill",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["test-skill"]) // Select item
			.mockResolvedValueOnce(["gemini"]) // Select platforms

		await add("skill")

		expect(prompts.intro).toHaveBeenCalled()
		expect(fs.copy).toHaveBeenCalled()
		expect(prompts.outro).toHaveBeenCalled()
	})

	it("should handle GitHub fetch and installation", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill"
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill",
			isFile: false,
		})

		vi.mocked(prompts.multiselect).mockResolvedValue(["gemini"])

		await add("skill", mockUrl)

		expect(fetchSkillFromGitHub).toHaveBeenCalledWith(mockUrl)
		expect(fs.copy).toHaveBeenCalled()
		expect(fs.remove).toHaveBeenCalledWith("/tmp/skill")
	})

	it("should handle GitHub fetch and file installation", async () => {
		const mockUrl = "https://github.com/owner/repo/blob/main/agent.md"
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/agent",
			skillName: "agent.md",
			isFile: true,
		})
		vi.mocked(fs.pathExists).mockImplementation((p: string) => {
			if (p.includes("/tmp/agent/agent.md")) return Promise.resolve(true)
			return Promise.resolve(true)
		})
		vi.mocked(fs.stat as unknown as () => Promise<fs.Stats>).mockResolvedValue({
			isFile: () => true,
		} as fs.Stats)

		vi.mocked(prompts.multiselect).mockResolvedValue(["gemini"])

		await add("agent", mockUrl)

		expect(fs.readFile).toHaveBeenCalled()
	})

	it("should handle cancel during multiselect", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValue([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])

		vi.mocked(prompts.multiselect).mockResolvedValue(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockReturnValue(true)

		await add("skill")
		expect(fs.copy).not.toHaveBeenCalled()
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
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockResolvedValue(true)
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
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockResolvedValue(true)
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValue([
			{
				name: "b-item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
			{
				name: "a-item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["a-item"])
			.mockResolvedValueOnce(["gemini"])

		await add("skill")

		expect(prompts.multiselect).toHaveBeenCalledWith(
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
			.mockResolvedValueOnce("skill") // First iteration: pick skill
			.mockResolvedValueOnce("exit") // Second iteration: exit

		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "skill1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["skill1"]) // Select skill
			.mockResolvedValueOnce(["gemini"]) // Select platform

		await add()

		expect(prompts.select).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "What would you like to add?",
			}),
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
		vi.mocked(prompts.multiselect).mockResolvedValue(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockReturnValue(true)
		await add("skill")
		expect(fs.copy).not.toHaveBeenCalled()
	})

	it("should return early if platform selection is cancelled", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"]) // items
			.mockResolvedValueOnce(Symbol("cancel")) // platforms
		vi.mocked(prompts.isCancel)
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true)

		await add("skill")
		expect(fs.copy).not.toHaveBeenCalled()
	})

	it("should return early if overwrite confirmation is cancelled", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(prompts.confirm).mockResolvedValue(Symbol("cancel"))
		vi.mocked(prompts.isCancel)
			.mockReturnValueOnce(false) // item
			.mockReturnValueOnce(false) // platform
			.mockReturnValueOnce(true) // overwrite

		await add("skill")
		expect(fs.copy).not.toHaveBeenCalled()
	})

	it("should handle installation errors in loop", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(fs.copy).mockRejectedValue(new Error("Disk full"))

		await add("skill")
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("item -> gemini: Disk full"),
		)
	})

	it("should cancel if source directory not found", async () => {
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockResolvedValue(false)
		await add("skill")
		expect(prompts.cancel).toHaveBeenCalledWith("skill directory not found!")
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should cancel if no supported platforms found", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])
		vi.mocked(prompts.multiselect).mockResolvedValueOnce(["item"])
		vi.mocked(getTargetPaths).mockReturnValue({})

		await add("skill")
		expect(prompts.cancel).toHaveBeenCalledWith(
			"No supported platforms found for type 'skill'.",
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should return early if interactive loop type selection is cancelled", async () => {
		vi.mocked(prompts.select).mockResolvedValue(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockReturnValue(true)
		await add()
		expect(fs.readdir).not.toHaveBeenCalled()
	})

	it("should handle error in loop catch block", async () => {
		// Mock select to return a value once, then throw on the next loop iteration check or similar
		// Actually, the simplest is to mock a dependency inside the loop to throw.
		vi.mocked(prompts.select).mockResolvedValueOnce("skill")
		vi.mocked(fs.pathExists).mockRejectedValueOnce(new Error("fatal error"))

		await add()
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("fatal error"),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should handle no items found in directory and continue in interactive mode", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockResolvedValue(true)
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([])

		await add()

		expect(prompts.note).toHaveBeenCalledWith(
			expect.stringContaining("No skills found in directory."),
			"Information",
		)
	})

	it("should handle item selection cancellation and continue in interactive mode", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])
		vi.mocked(prompts.multiselect).mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel)
			.mockReset()
			.mockReturnValueOnce(false) // for select
			.mockReturnValueOnce(true) // for multiselect items
			.mockReturnValue(false)

		await add()
		expect(prompts.select).toHaveBeenCalledTimes(2)
	})

	it("should handle platform selection cancellation and continue in interactive mode", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"]) // Items
			.mockResolvedValueOnce(Symbol("cancel")) // Platforms
		vi.mocked(prompts.isCancel)
			.mockReset()
			.mockReturnValueOnce(false) // select
			.mockReturnValueOnce(false) // items
			.mockReturnValueOnce(true) // platforms
			.mockReturnValue(false)

		await add()
		expect(prompts.select).toHaveBeenCalledTimes(2)
	})

	it("should handle overwrite confirmation cancellation and continue in interactive mode", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("skill")
			.mockResolvedValueOnce("exit")
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(prompts.confirm).mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel)
			.mockReset()
			.mockReturnValueOnce(false) // select
			.mockReturnValueOnce(false) // item
			.mockReturnValueOnce(false) // platform
			.mockReturnValueOnce(true) // confirm overwrite
			.mockReturnValue(false)

		await add()
		expect(prompts.select).toHaveBeenCalledTimes(2)
	})

	it("should throw error if item not found during installation", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"])

		// Ensure fs.stat doesn't throw here for local source check
		vi.mocked(fs.stat as unknown as () => Promise<fs.Stats>).mockResolvedValue({
			isFile: () => false,
		} as fs.Stats)

		// First pathExists for source check, second for installation check
		vi.mocked(fs.pathExists).mockImplementation((p: string) => {
			if (p.includes("/mock/skills/item")) return Promise.resolve(false) // item not found in installItem
			return Promise.resolve(true)
		})

		await add("skill")
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("item -> gemini: Item 'item' not found"),
		)
	})

	it("should skip item if not overwriting and target exists", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		])
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"])

		// Handle various pathExists calls
		vi.mocked(fs.pathExists).mockImplementation((p: string) => {
			if (p.includes("/mock/skills")) return Promise.resolve(true) // source exists
			if (p.includes("/mock/gemini/path")) return Promise.resolve(true) // target exists
			return Promise.resolve(true)
		})

		vi.mocked(prompts.confirm).mockResolvedValueOnce(false) // don't overwrite

		await add("skill")
		expect(fs.copy).not.toHaveBeenCalled()
	})

	it("should handle more than 5 existing items in warning message", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{ name: "item1", isDirectory: () => true, isFile: () => false },
			{ name: "item2", isDirectory: () => true, isFile: () => false },
			{ name: "item3", isDirectory: () => true, isFile: () => false },
			{ name: "item4", isDirectory: () => true, isFile: () => false },
			{ name: "item5", isDirectory: () => true, isFile: () => false },
			{ name: "item6", isDirectory: () => true, isFile: () => false },
		] as unknown as fs.Dirent<string>[])
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce([
				"item1",
				"item2",
				"item3",
				"item4",
				"item5",
				"item6",
			])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(prompts.confirm).mockResolvedValue(true)

		await add("skill")
		expect(prompts.note).toHaveBeenCalledWith(
			expect.stringContaining("and 1 others"),
			"Attention",
		)
	})

	it("should handle non-Error exception during installation", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{ name: "item", isDirectory: () => true, isFile: () => false },
		] as unknown as fs.Dirent<string>[])
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(fs.copy).mockRejectedValue("string error")

		await add("skill")
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("item -> gemini: string error"),
		)
	})

	it("should handle platform-specific transformation for agent/workflow and skip if exists", async () => {
		const mockUrl = "https://github.com/owner/repo/blob/main/agent.md"
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/agent",
			skillName: "agent.md",
			isFile: true,
		})
		vi.mocked(fs.pathExists).mockImplementation((p: string) => {
			if (p.includes("/mock/gemini/path")) return Promise.resolve(true) // target exists
			return Promise.resolve(true) // source exists
		})
		vi.mocked(fs.stat as unknown as () => Promise<fs.Stats>).mockResolvedValue({
			isFile: () => true,
		} as fs.Stats)

		vi.mocked(prompts.multiselect).mockResolvedValue(["gemini"])
		vi.mocked(prompts.confirm).mockResolvedValue(false) // don't overwrite

		await add("agent", mockUrl)

		expect(fs.readFile).not.toHaveBeenCalled()
	})

	it("should handle fetch with undefined type (normalized to empty string)", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		vi.mocked(prompts.multiselect).mockResolvedValue(["gemini"])

		await add(undefined, "https://github.com/url")

		expect(fs.copy).toHaveBeenCalled()
	})

	it("should cleanup tempDir if platform selection is cancelled", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		vi.mocked(prompts.multiselect).mockResolvedValue(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockReturnValue(true)

		await add("skill", "url")
		expect(fs.remove).toHaveBeenCalledWith("/tmp/item")
	})

	it("should cleanup tempDir if overwrite confirmation is cancelled", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		})
		vi.mocked(prompts.multiselect).mockResolvedValue(["gemini"])
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(prompts.confirm).mockResolvedValue(Symbol("cancel"))
		vi.mocked(prompts.isCancel)
			.mockReset()
			.mockReturnValueOnce(false) // multiselect platforms
			.mockReturnValueOnce(true) // confirm overwrite
			.mockReturnValue(false)

		await add("skill", "url")
		expect(fs.remove).toHaveBeenCalledWith("/tmp/item")
	})

	it("should handle missing targetBase during check and installation", async () => {
		vi.mocked(getTargetPaths).mockReturnValue({
			gemini: "", // missing path
		})
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"])
		// readdir mock
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValueOnce([
			{ name: "item", isDirectory: () => true, isFile: () => false },
		] as unknown as fs.Dirent<string>[])

		await add("skill")
		expect(fs.pathExists).not.toHaveBeenCalledWith(
			expect.stringMatching(/\/item$/),
		)
		expect(fs.copy).not.toHaveBeenCalled()
	})

	it("should handle currentType being null/undefined for normalizedType coverage", async () => {
		// Mock select to return "exit" immediately
		vi.mocked(prompts.select).mockResolvedValueOnce("exit")
		// add(undefined) will make currentType undefined
		await add(undefined)
		expect(prompts.select).toHaveBeenCalled()
	})

	it("should handle fetch with non-md file", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item.txt",
			isFile: true,
		})
		vi.mocked(fs.pathExists).mockResolvedValue(true as never)
		vi.mocked(fs.stat as unknown as () => Promise<fs.Stats>).mockResolvedValue({
			isFile: () => true,
		} as fs.Stats)
		vi.mocked(prompts.multiselect).mockResolvedValue(["gemini"])

		await add("skill", "url")
		expect(fs.copy).toHaveBeenCalled()
	})

	it("should handle error when tempDir is null in catch block", async () => {
		vi.mocked(fetchSkillFromGitHub).mockRejectedValue(
			new Error("pre-fetch error"),
		)
		await add("skill", "url")
		expect(fs.remove).not.toHaveBeenCalled()
	})
})
