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

describe(`${add.name} - Codex`, () => {
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
			codex: "/mock/codex/skills",
		})
		vi.mocked(PLATFORM_LABELS).codex = "Codex"
		vi.mocked(TYPE_DIRS).agent = "/mock/agents"
		vi.mocked(TYPE_DIRS).workflow = "/mock/workflows"

		vi.mocked(prompts.confirm).mockResolvedValue(true)
		vi.mocked(prompts.select).mockResolvedValue("exit")
	})

	afterEach(() => {
		vi.resetAllMocks()
	})

	it("should convert an agent into a Codex skill package", async () => {
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
			"---\nname: review-agent\ndescription: This skill should be used when reviewing code.\n---\n\n# Review Agent\nBody" as never,
		)

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["agent.md"])
			.mockResolvedValueOnce(["codex"])

		await add("agent")

		expect(fs.writeFile).toHaveBeenCalledWith(
			"/mock/codex/skills/agent/SKILL.md",
			expect.stringContaining("x-ai-agents-type: agent"),
		)
	})

	it("should convert a workflow into a Codex skill package", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValue([
			{
				name: "workflow.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		])
		vi.mocked(fs.readFile).mockResolvedValue(
			"# Workflow Title\nPrompt content" as never,
		)

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["workflow.md"])
			.mockResolvedValueOnce(["codex"])

		await add("workflow")

		expect(fs.writeFile).toHaveBeenCalledWith(
			"/mock/codex/skills/workflow/SKILL.md",
			expect.stringContaining("x-ai-agents-type: workflow"),
		)
	})

	it("should detect existing transformed Codex targets before prompting overwrite", async () => {
		vi.mocked(
			fs.readdir as unknown as () => Promise<fs.Dirent<string>[]>,
		).mockResolvedValue([
			{
				name: "workflow.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		])
		vi.mocked(fs.pathExists).mockImplementation((p: string) => {
			if (p === "/mock/workflows") return Promise.resolve(true)
			if (p === "/mock/codex/skills/workflow/SKILL.md")
				return Promise.resolve(true)
			if (p === "/mock/workflows/workflow.md") return Promise.resolve(true)
			return Promise.resolve(false)
		})
		vi.mocked(fs.readFile).mockResolvedValue(
			"# Workflow Title\nPrompt content" as never,
		)
		vi.mocked(prompts.confirm).mockResolvedValue(false)

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["workflow.md"])
			.mockResolvedValueOnce(["codex"])

		await add("workflow")

		expect(prompts.confirm).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Do you want to overwrite existing items?",
			}),
		)
		expect(fs.writeFile).not.toHaveBeenCalled()
	})
})
