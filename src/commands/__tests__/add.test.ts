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

	beforeEach(() => {
		mockExit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never)
		vi.spyOn(console, "log").mockImplementation(() => {})

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
})
