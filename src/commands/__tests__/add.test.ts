import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import * as prompts from "@clack/prompts";
import { add } from "../add.ts";
import { fetchSkillFromGitHub } from "../../utils/github.js";
import { getTargetPaths, PLATFORM_LABELS, TYPE_DIRS } from "../../utils/paths.js";

vi.mock("fs-extra");
vi.mock("@clack/prompts");
vi.mock("../../utils/github.js");
vi.mock("../../utils/paths.js");

describe("src/commands/add.ts", () => {
	let mockExit: any;
	let mockConsoleError: any;

	beforeEach(() => {
		vi.resetAllMocks();
		mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		vi.spyOn(console, "log").mockImplementation(() => {});
		mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        (prompts.isCancel as any).mockReturnValue(false);
        (prompts.spinner as any).mockReturnValue({
            start: vi.fn(),
            stop: vi.fn(),
            message: vi.fn(),
        });
        (fs.pathExists as any).mockResolvedValue(true);
        (fs.stat as any).mockResolvedValue({ isFile: () => false });

        (getTargetPaths as any).mockReturnValue({
            gemini: "/mock/gemini/path",
            copilot: "/mock/copilot/path"
        });
        (PLATFORM_LABELS as any).gemini = "Gemini CLI";
        (PLATFORM_LABELS as any).copilot = "GitHub Copilot";
        (TYPE_DIRS as any).skill = "/mock/skills";
        (TYPE_DIRS as any).agent = "/mock/agents";
        (TYPE_DIRS as any).workflow = "/mock/workflows";

        (prompts.confirm as any).mockResolvedValue(true);
	});

	afterEach(() => {
		mockExit.mockClear();
	});

	it("should cancel if type is unknown", async () => {
		await add("unknown");
		expect(prompts.cancel).toHaveBeenCalledWith(expect.stringContaining("Unknown type"));
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should handle local selection and installation", async () => {
		(fs.readdir as any).mockResolvedValue([
			{ name: "test-skill", isDirectory: () => true, isFile: () => false },
		]);

		(prompts.multiselect as any)
			.mockResolvedValueOnce(["test-skill"]) // Select item
			.mockResolvedValueOnce(["gemini", "unsupported"]); // Select platforms

		await add("skill");

		expect(prompts.intro).toHaveBeenCalled();
		expect(fs.copy).toHaveBeenCalled();
		expect(prompts.outro).toHaveBeenCalled();
	});

	it("should handle GitHub fetch and installation", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill";
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill",
			isFile: false,
		});

		(prompts.multiselect as any).mockResolvedValue(["gemini"]);

		await add("skill", mockUrl);

		expect(fetchSkillFromGitHub).toHaveBeenCalledWith(mockUrl);
		expect(fs.copy).toHaveBeenCalled();
		expect(fs.remove).toHaveBeenCalledWith("/tmp/skill");
	});

	it("should handle existing items and prompt for overwrite", async () => {
		(fs.readdir as any).mockResolvedValue([
			{ name: "test-skill", isDirectory: () => true, isFile: () => false },
		]);

		(prompts.multiselect as any)
			.mockResolvedValueOnce(["test-skill"])
			.mockResolvedValueOnce(["gemini"]);
		
		(prompts.confirm as any).mockResolvedValue(true); // Overwrite = true

		await add("skill");

		expect(prompts.note).toHaveBeenCalledWith(expect.stringContaining("already exist"), "Attention");
		expect(fs.copy).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ overwrite: true }));
	});

	it("should handle cancel during multiselect", async () => {
		(fs.readdir as any).mockResolvedValue([
			{ name: "item", isDirectory: () => true, isFile: () => false },
		]);

		(prompts.multiselect as any).mockResolvedValue(Symbol("cancel"));
		(prompts.isCancel as any).mockReturnValue(true);

		await add("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
	});

    it("should handle Gemini workflow conversion", async () => {
		(fs.readdir as any).mockResolvedValue([
			{ name: "workflow.md", isDirectory: () => false, isFile: () => true },
		]);
		(fs.stat as any).mockResolvedValue({ isFile: () => true });
        (fs.readFile as any).mockResolvedValue("# Title\nPrompt content");

		(prompts.multiselect as any)
			.mockResolvedValueOnce(["workflow.md"])
			.mockResolvedValueOnce(["gemini"]);

        await add("workflow");

        expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining(".toml"), expect.stringContaining("description = \"Title\""));
    });

	it("should handle GitHub fetch failure", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill";
		(fetchSkillFromGitHub as any).mockRejectedValue(new Error("Network error"));

		await add("skill", mockUrl);

		expect(prompts.cancel).toHaveBeenCalledWith(expect.stringContaining("Network error"));
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should cancel if source directory not found", async () => {
		(fs.pathExists as any).mockResolvedValue(false);

		await add("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("skill directory not found!");
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should cancel if no items found in directory", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readdir as any).mockResolvedValue([]);

		await add("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("No skills found in directory.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should cancel if no supported platforms found", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readdir as any).mockResolvedValue([{ name: "item", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["item"]);
		(getTargetPaths as any).mockReturnValue({});

		await add("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("No supported platforms found for type 'skill'.");
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should handle cancel during overwrite confirmation", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readdir as any).mockResolvedValue([{ name: "item", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["item"]).mockResolvedValueOnce(["gemini"]);
		(prompts.confirm as any).mockResolvedValue(Symbol("cancel"));
		(prompts.isCancel as any).mockImplementation((val) => typeof val === "symbol");

		await add("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle single file from GitHub", async () => {
		const mockUrl = "https://github.com/owner/repo/blob/main/skill.md";
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill.md",
			isFile: true,
		});
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.stat as any).mockResolvedValue({ isFile: () => true });
		(prompts.multiselect as any).mockResolvedValue(["gemini"]);

		await add("skill", mockUrl);

		expect(fs.copy).toHaveBeenCalled();
	});

	it("should handle Windsurf Agent special naming", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readdir as any).mockResolvedValue([{ name: "my-agent.md", isDirectory: () => false, isFile: () => true }]);
		(fs.stat as any).mockResolvedValue({ isFile: () => true });
		(getTargetPaths as any).mockReturnValue({ windsurf: "/mock/windsurf" });
		(prompts.multiselect as any).mockResolvedValueOnce(["my-agent.md"]).mockResolvedValueOnce(["windsurf"]);

		await add("agent");

		expect(fs.copy).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("my-agent/AGENTS.md"), expect.anything());
	});

	it("should handle installation errors and display summary", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readdir as any).mockResolvedValue([{ name: "item", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["item"]).mockResolvedValueOnce(["gemini"]);
		(fs.copy as any).mockRejectedValue(new Error("Copy failed"));

		await add("skill");

		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Errors encountered"));
	});

	it("should handle skip if overwrite is false and item exists", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readdir as any).mockResolvedValue([{ name: "item", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["item"]).mockResolvedValueOnce(["gemini"]);
		(prompts.confirm as any).mockResolvedValue(false);

		await add("skill");

		expect(fs.copy).not.toHaveBeenCalled();
	});

	it("should skip Gemini workflow if already exists and overwrite is false", async () => {
		(fs.readdir as any).mockResolvedValue([{ name: "wf.md", isDirectory: () => false, isFile: () => true }]);
		(fs.stat as any).mockResolvedValue({ isFile: () => true });
		(prompts.multiselect as any).mockResolvedValueOnce(["wf.md"]).mockResolvedValueOnce(["gemini"]);
		(prompts.confirm as any).mockResolvedValue(false);
		
		// Target path for existing check (line 161) will be wf.md
		// Target path for loop check (line 272) will be wf.toml
		(fs.pathExists as any).mockImplementation((p) => p.includes("wf.md") || p.includes("wf.toml"));

		await add("workflow");

		expect(fs.writeFile).not.toHaveBeenCalled();
	});

	it("should sort available items", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readdir as any).mockResolvedValue([
			{ name: "b-item", isDirectory: () => true, isFile: () => false },
			{ name: "a-item", isDirectory: () => true, isFile: () => false },
		]);
		(prompts.multiselect as any).mockResolvedValueOnce(["a-item"]).mockResolvedValueOnce(["gemini"]);

		await add("skill");

		expect(prompts.multiselect).toHaveBeenCalledWith(expect.objectContaining({
			options: [
				{ label: "a-item", value: "a-item" },
				{ label: "b-item", value: "b-item" },
			]
		}));
	});

	it("should handle missing source path in installItem", async () => {
		(fs.pathExists as any).mockImplementation((p) => {
			if (p === "/mock/skills") return Promise.resolve(true); // sourceDir exists
			if (p.includes("item")) return Promise.resolve(false); // item doesn't exist at source
			return Promise.resolve(true);
		});
		(fs.readdir as any).mockResolvedValue([{ name: "item", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["item"]).mockResolvedValueOnce(["gemini"]);

		await add("skill");

		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Item 'item' not found"));
	});

	it("should normalize plural type", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readdir as any).mockResolvedValue([{ name: "item", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["item"]).mockResolvedValueOnce(["gemini"]);

		await add("skills");

		expect(prompts.intro).toHaveBeenCalledWith(expect.stringContaining("Add skills"));
	});

	it("should cleanup tempDir if cancelled after GitHub fetch", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill";
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill",
			isFile: false,
		});
		(prompts.multiselect as any).mockResolvedValue(Symbol("cancel"));
		(prompts.isCancel as any).mockReturnValue(true);

		await add("skill", mockUrl);

		expect(fs.remove).toHaveBeenCalledWith("/tmp/skill");
	});

	it("should cleanup tempDir if cancelled during overwrite after GitHub fetch", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill";
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill",
			isFile: false,
		});
		(prompts.multiselect as any).mockResolvedValueOnce(["gemini"]);
		(fs.pathExists as any).mockResolvedValue(true); // Item exists
		(prompts.confirm as any).mockResolvedValue(Symbol("cancel"));
		(prompts.isCancel as any).mockImplementation((val) => typeof val === "symbol");

		await add("skill", mockUrl);

		expect(fs.remove).toHaveBeenCalledWith("/tmp/skill");
	});

	it("should display remainder message if many items already exist", async () => {
		(fs.readdir as any).mockResolvedValue([{ name: "item", isDirectory: () => true, isFile: () => false }]);
		
		(getTargetPaths as any).mockReturnValue({
			p1: "/p1", p2: "/p2", p3: "/p3", p4: "/p4", p5: "/p5", p6: "/p6"
		});
		(PLATFORM_LABELS as any).p1 = "P1";
		(PLATFORM_LABELS as any).p2 = "P2";
		(PLATFORM_LABELS as any).p3 = "P3";
		(PLATFORM_LABELS as any).p4 = "P4";
		(PLATFORM_LABELS as any).p5 = "P5";
		(PLATFORM_LABELS as any).p6 = "P6";

		(prompts.multiselect as any)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["p1", "p2", "p3", "p4", "p5", "p6"]);
		(fs.pathExists as any).mockResolvedValue(true);

		await add("skill");

		expect(prompts.note).toHaveBeenCalledWith(expect.stringContaining("and 1 others"), "Attention");
	});

	it("should handle non-Error throws in loop", async () => {
		(fs.readdir as any).mockResolvedValue([{ name: "item", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["item"]).mockResolvedValueOnce(["gemini"]);
		(fs.copy as any).mockRejectedValue("String error");

		await add("skill");

		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("item -> gemini: String error"));
	});

	it("should cleanup tempDir on outer error after GitHub fetch", async () => {
		const mockUrl = "https://github.com/owner/repo/tree/main/skill";
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/skill",
			skillName: "skill",
			isFile: false,
		});
		(prompts.multiselect as any).mockImplementation(() => { throw new Error("Unexpected error"); });

		await add("skill", mockUrl);

		expect(fs.remove).toHaveBeenCalledWith("/tmp/skill");
	});
});
