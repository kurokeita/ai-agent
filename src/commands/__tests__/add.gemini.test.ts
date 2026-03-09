import * as prompts from "@clack/prompts"
import fs from "fs-extra"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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

describe(`${add.name} - Gemini`, () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {})

		vi.mocked(prompts.isCancel).mockReturnValue(false)
		vi.mocked(prompts.spinner).mockReturnValue({
			start: vi.fn(),
			stop: vi.fn(),
			message: vi.fn(),
		})
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockResolvedValue(true)
		vi.mocked(fs.stat as unknown as () => Promise<fs.Stats>).mockResolvedValue({
			isFile: () => true,
		} as fs.Stats)

		vi.mocked(getTargetPaths).mockReturnValue({
			gemini: "/mock/gemini/path",
		})
		vi.mocked(PLATFORM_LABELS).gemini = "Gemini CLI"
		vi.mocked(TYPE_DIRS).agent = "/mock/agents"
		vi.mocked(TYPE_DIRS).workflow = "/mock/workflows"

		vi.mocked(prompts.confirm).mockResolvedValue(true)
		vi.mocked(prompts.select).mockResolvedValue("exit")
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it("should handle Gemini workflow conversion to TOML", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValue([
			{
				name: "workflow.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		])
		vi.mocked(fs.readFile).mockResolvedValue("# Title\nPrompt content" as never)

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["workflow.md"])
			.mockResolvedValueOnce(["gemini"])

		await add("workflow")

		expect(fs.writeFile).toHaveBeenCalledWith(
			expect.stringContaining("workflow.toml"),
			expect.stringContaining('description = "Title"'),
		)
	})

	it("should handle Gemini agent transformation with tools", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValue([
			{
				name: "agent.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		])
		vi.mocked(fs.readFile).mockResolvedValue(
			"---\nname: test\n---\nBody" as never,
		)

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["agent.md"])
			.mockResolvedValueOnce(["gemini"])

		await add("agent")

		expect(fs.writeFile).toHaveBeenCalledWith(
			expect.stringContaining("agent.md"),
			expect.stringContaining("list_directory"),
		)
	})

	it("should skip Gemini workflow if already exists and overwrite is false", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValue([
			{
				name: "wf.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		])
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["wf.md"])
			.mockResolvedValueOnce(["gemini"])
		vi.mocked(prompts.confirm).mockResolvedValue(false)

		vi.mocked(fs.pathExists).mockImplementation((p: string) => {
			if (p === "/mock/workflows") return Promise.resolve(true)
			if (p.includes("wf.md")) return Promise.resolve(true)
			if (p.includes("wf.toml")) return Promise.resolve(true)
			return Promise.resolve(false)
		})

		await add("workflow")

		expect(fs.writeFile).not.toHaveBeenCalled()
	})
})
