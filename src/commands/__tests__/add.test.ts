import * as prompts from "@clack/prompts";
import fs from "fs-extra";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import { fetchSkillFromGitHub } from "../../utils/github.js";
import {
	getTargetPaths,
	PLATFORM_LABELS,
	TYPE_DIRS,
} from "../../utils/paths.js";
import { add } from "../add.ts";

vi.mock("fs-extra");
vi.mock("@clack/prompts");
vi.mock("../../utils/github.js");
vi.mock("../../utils/paths.js");

describe("src/commands/add.ts", () => {
	let mockExit: MockInstance;
	let mockConsoleError: MockInstance;

	beforeEach(() => {
		vi.resetAllMocks();
		mockExit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never);
		vi.spyOn(console, "log").mockImplementation(() => {});
		mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		vi.mocked(prompts.isCancel).mockReturnValue(false);
		vi.mocked(prompts.spinner).mockReturnValue({
			start: vi.fn(),
			stop: vi.fn(),
			message: vi.fn(),
		});
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as fs.Stats);

		vi.mocked(getTargetPaths).mockReturnValue({
			gemini: "/mock/gemini/path",
			copilot: "/mock/copilot/path",
		});
		vi.mocked(PLATFORM_LABELS).gemini = "Gemini CLI";
		vi.mocked(PLATFORM_LABELS).copilot = "GitHub Copilot";
		vi.mocked(TYPE_DIRS).skill = "/mock/skills";
		vi.mocked(TYPE_DIRS).agent = "/mock/agents";
		vi.mocked(TYPE_DIRS).workflow = "/mock/workflows";

		vi.mocked(prompts.confirm).mockResolvedValue(true);
	});

	afterEach(() => {
		mockExit.mockClear();
	});

	it("should cancel if type is unknown", async () => {
		await add("unknown");
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Unknown type"),
		);
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should handle local selection and installation", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "test-skill",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		]);

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["test-skill"]) // Select item
			.mockResolvedValueOnce(["gemini", "unsupported"]); // Select platforms

		await add("skill");

		expect(prompts.intro).toHaveBeenCalled();
		expect(fs.copy).toHaveBeenCalled();
		expect(prompts.outro).toHaveBeenCalled();
	});

	it("should handle GitHub fetch and installation", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill";
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill",
			isFile: false,
		});

		vi.mocked(prompts.multiselect).mockResolvedValue(["gemini"]);

		await add("skill", mockUrl);

		expect(fetchSkillFromGitHub).toHaveBeenCalledWith(mockUrl);
		expect(fs.copy).toHaveBeenCalled();
		expect(fs.remove).toHaveBeenCalledWith("/tmp/skill");
	});

	it("should handle existing items and prompt for overwrite", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "test-skill",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		]);

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["test-skill"])
			.mockResolvedValueOnce(["gemini"]);

		vi.mocked(prompts.confirm).mockResolvedValue(true); // Overwrite = true

		await add("skill");

		expect(prompts.note).toHaveBeenCalledWith(
			expect.stringContaining("already exist"),
			"Attention",
		);
		expect(fs.copy).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.objectContaining({ overwrite: true }),
		);
	});

	it("should handle cancel during multiselect", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		]);

		vi.mocked(prompts.multiselect).mockResolvedValue(Symbol("cancel"));
		vi.mocked(prompts.isCancel).mockReturnValue(true);

		await add("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
	});

	it("should handle Gemini workflow conversion", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "workflow.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		]);
		vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as fs.Stats);
		vi.mocked(fs.readFile).mockResolvedValue(
			"# Title\nPrompt content" as never,
		);

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["workflow.md"])
			.mockResolvedValueOnce(["gemini"]);

		await add("workflow");

		expect(fs.writeFile).toHaveBeenCalledWith(
			expect.stringContaining(".toml"),
			expect.stringContaining('description = "Title"'),
		);
	});

	it("should handle GitHub fetch failure", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill";
		vi.mocked(fetchSkillFromGitHub).mockRejectedValue(
			new Error("Network error"),
		);

		await add("skill", mockUrl);

		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Network error"),
		);
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should cancel if source directory not found", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(false);

		await add("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("skill directory not found!");
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should cancel if no items found in directory", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.readdir).mockResolvedValue([]);

		await add("skill");

		expect(prompts.cancel).toHaveBeenCalledWith(
			"No skills found in directory.",
		);
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should cancel if no supported platforms found", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		]);
		vi.mocked(prompts.multiselect).mockResolvedValueOnce(["item"]);
		vi.mocked(getTargetPaths).mockReturnValue({});

		await add("skill");

		expect(prompts.cancel).toHaveBeenCalledWith(
			"No supported platforms found for type 'skill'.",
		);
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should handle cancel during overwrite confirmation", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		]);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"]);
		vi.mocked(prompts.confirm).mockResolvedValue(Symbol("cancel"));
		vi.mocked(prompts.isCancel).mockImplementation(
			(val) => typeof val === "symbol",
		);

		await add("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle single file from GitHub", async () => {
		const mockUrl = "https://github.com/owner/repo/blob/main/skill.md";
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill.md",
			isFile: true,
		});
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as fs.Stats);
		vi.mocked(prompts.multiselect).mockResolvedValue(["gemini"]);

		await add("skill", mockUrl);

		expect(fs.copy).toHaveBeenCalled();
	});

	it("should handle Windsurf Agent special naming", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "my-agent.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		]);
		vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as fs.Stats);
		vi.mocked(getTargetPaths).mockReturnValue({ windsurf: "/mock/windsurf" });
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["my-agent.md"])
			.mockResolvedValueOnce(["windsurf"]);

		await add("agent");

		expect(fs.copy).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining("my-agent/AGENTS.md"),
			expect.anything(),
		);
	});

	it("should handle installation errors and display summary", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		]);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"]);
		vi.mocked(fs.copy).mockRejectedValue(new Error("Copy failed") as never);

		await add("skill");

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Errors encountered"),
		);
	});

	it("should handle skip if overwrite is false and item exists", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		]);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"]);
		vi.mocked(prompts.confirm).mockResolvedValue(false);

		await add("skill");

		expect(fs.copy).not.toHaveBeenCalled();
	});

	it("should skip Gemini workflow if already exists and overwrite is false", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "wf.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		]);
		vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as fs.Stats);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["wf.md"])
			.mockResolvedValueOnce(["gemini"]);
		vi.mocked(prompts.confirm).mockResolvedValue(false);

		vi.mocked(fs.pathExists).mockImplementation((p) => {
			// Line 161: check if item exists
			if (p.includes("wf.md")) return Promise.resolve(true);
			// Line 272: check if converted .toml exists
			if (p.includes("wf.toml")) return Promise.resolve(true);
			return Promise.resolve(false);
		});

		await add("workflow");

		expect(fs.writeFile).not.toHaveBeenCalled();
	});

	it("should sort available items", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.readdir).mockResolvedValue([
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
		]);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["a-item"])
			.mockResolvedValueOnce(["gemini"]);

		await add("skill");

		expect(prompts.multiselect).toHaveBeenCalledWith(
			expect.objectContaining({
				options: [
					{ label: "a-item", value: "a-item" },
					{ label: "b-item", value: "b-item" },
				],
			}),
		);
	});

	it("should handle missing source path in installItem", async () => {
		vi.mocked(fs.pathExists).mockImplementation((p) => {
			if (p === "/mock/skills") return Promise.resolve(true); // sourceDir exists
			if (p.includes("item")) return Promise.resolve(false); // item doesn't exist at source
			return Promise.resolve(true);
		});
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		]);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"]);

		await add("skill");

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Item 'item' not found"),
		);
	});

	it("should normalize plural type", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		]);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"]);

		await add("skills");

		expect(prompts.intro).toHaveBeenCalledWith(
			expect.stringContaining("Add skills"),
		);
	});

	it("should cleanup tempDir if cancelled after GitHub fetch", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill";
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill",
			isFile: false,
		});
		vi.mocked(prompts.multiselect).mockResolvedValue(Symbol("cancel"));
		vi.mocked(prompts.isCancel).mockReturnValue(true);

		await add("skill", mockUrl);

		expect(fs.remove).toHaveBeenCalledWith("/tmp/skill");
	});

	it("should cleanup tempDir if cancelled during overwrite after GitHub fetch", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill";
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill",
			isFile: false,
		});
		vi.mocked(prompts.multiselect).mockResolvedValueOnce(["gemini"]);
		vi.mocked(fs.pathExists).mockResolvedValue(true); // Item exists
		vi.mocked(prompts.confirm).mockResolvedValue(Symbol("cancel"));
		vi.mocked(prompts.isCancel).mockImplementation(
			(val) => typeof val === "symbol",
		);

		await add("skill", mockUrl);

		expect(fs.remove).toHaveBeenCalledWith("/tmp/skill");
	});

	it("should display remainder message if many items already exist", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		]);

		vi.mocked(getTargetPaths).mockReturnValue({
			p1: "/p1",
			p2: "/p2",
			p3: "/p3",
			p4: "/p4",
			p5: "/p5",
			p6: "/p6",
		});
		vi.mocked(PLATFORM_LABELS).p1 = "P1";
		vi.mocked(PLATFORM_LABELS).p2 = "P2";
		vi.mocked(PLATFORM_LABELS).p3 = "P3";
		vi.mocked(PLATFORM_LABELS).p4 = "P4";
		vi.mocked(PLATFORM_LABELS).p5 = "P5";
		vi.mocked(PLATFORM_LABELS).p6 = "P6";

		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["p1", "p2", "p3", "p4", "p5", "p6"]);
		vi.mocked(fs.pathExists).mockResolvedValue(true);

		await add("skill");

		expect(prompts.note).toHaveBeenCalledWith(
			expect.stringContaining("and 1 others"),
			"Attention",
		);
	});

	it("should handle non-Error throws in loop", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		]);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"]);
		vi.mocked(fs.copy).mockRejectedValue("String error" as never);

		await add("skill");

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("item -> gemini: String error"),
		);
	});

	it("should cleanup tempDir on outer error after GitHub fetch", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill";
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill",
			isFile: false,
		});
		vi.mocked(prompts.multiselect).mockImplementation(() => {
			throw new Error("Unexpected error");
		});

		await add("skill", mockUrl);

		expect(fs.remove).toHaveBeenCalledWith("/tmp/skill");
	});
});
