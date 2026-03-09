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

describe("src/commands/add.ts - Antigravity", () => {
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
			antigravity: "/mock/antigravity/path",
		})
		vi.mocked(PLATFORM_LABELS).antigravity = "Antigravity (Serena)"
		vi.mocked(TYPE_DIRS).skill = "/mock/skills"

		vi.mocked(prompts.confirm).mockResolvedValue(true)
		vi.mocked(prompts.select).mockResolvedValue("exit")
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it("should handle Antigravity skill installation (standard copy)", async () => {
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
			.mockResolvedValueOnce(["test-skill"])
			.mockResolvedValueOnce(["antigravity"])

		await add("skill")

		expect(fs.copy).toHaveBeenCalledWith(
			expect.stringContaining("test-skill"),
			expect.stringContaining("/mock/antigravity/path/test-skill"),
			expect.anything(),
		)
	})
})
