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

describe(`${add.name} - Claude Code`, () => {
	beforeEach(() => {
		vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
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
			"claude-code": "/mock/claude-code/path",
		})
		vi.mocked(PLATFORM_LABELS)["claude-code"] = "Claude Code"
		vi.mocked(TYPE_DIRS).agent = "/mock/agents"

		vi.mocked(prompts.confirm).mockResolvedValue(true)
		vi.mocked(prompts.select).mockResolvedValue("exit")
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it("should handle Claude Code agent transformation", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValue([
			{
				name: "my-agent.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		])
		vi.mocked(fs.readFile).mockResolvedValue(
			"---\nname: test\n---\nBody" as never,
		)

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["my-agent.md"])
			.mockResolvedValueOnce(["claude-code"])

		await add("agent")

		expect(fs.writeFile).toHaveBeenCalledWith(
			expect.stringContaining("my-agent.md"),
			expect.stringContaining("- Read"),
		)
	})
})
