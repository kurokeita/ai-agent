import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs-extra";
import * as prompts from "@clack/prompts";
import { importItem } from "../import.ts";
import { fetchSkillFromGitHub } from "../../utils/github.js";
import { TYPE_DIRS } from "../../utils/paths.js";

vi.mock("fs-extra");
vi.mock("@clack/prompts");
vi.mock("../../utils/github.js");
vi.mock("../../utils/paths.js");

describe("src/commands/import.ts", () => {
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
		(fs.pathExists as any).mockResolvedValue(false);
		(fs.stat as any).mockResolvedValue({ isFile: () => false });

		(TYPE_DIRS as any).skill = "/mock/skills";
		(TYPE_DIRS as any).agent = "/mock/agents";
		(TYPE_DIRS as any).workflow = "/mock/workflows";

		(prompts.confirm as any).mockResolvedValue(true);
	});

	it("should cancel if type is unknown", async () => {
		await importItem("unknown", "url");
		expect(prompts.cancel).toHaveBeenCalledWith(expect.stringContaining("Unknown type"));
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should cancel if URL is missing", async () => {
		await importItem("skill", "");
		expect(prompts.cancel).toHaveBeenCalledWith("GitHub URL is required.");
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should handle GitHub fetch failure", async () => {
		(fetchSkillFromGitHub as any).mockRejectedValue(new Error("Fetch failed"));
		await importItem("skill", "url");
		expect(prompts.cancel).toHaveBeenCalledWith(expect.stringContaining("Fetch failed"));
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should import skill correctly (no conflicts)", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});

		await importItem("skill", "url");

		expect(fs.copy).toHaveBeenCalledWith("/tmp/item", expect.stringContaining("item"), expect.anything());
		expect(prompts.outro).toHaveBeenCalled();
	});

	it("should import skill correctly (with overwrite confirmation)", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		(fs.pathExists as any).mockResolvedValue(true);
		(prompts.confirm as any).mockResolvedValue(true);

		await importItem("skill", "url");

		expect(prompts.confirm).toHaveBeenCalled();
		expect(fs.copy).toHaveBeenCalled();
	});

	it("should cancel skill import if overwrite is declined", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		(fs.pathExists as any).mockResolvedValue(true);
		(prompts.confirm as any).mockResolvedValue(false);

		await importItem("skill", "url");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should flatten agent/workflow import", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		(fs.readdir as any).mockResolvedValue(["file1.md"]);

		await importItem("agent", "url");

		expect(fs.copy).toHaveBeenCalledWith("/tmp/item", "/mock/agents", expect.anything());
	});

	it("should handle conflicts when flattening", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		(fs.readdir as any).mockResolvedValue(["f1", "f2", "f3", "f4", "f5", "f6"]);
		(fs.pathExists as any).mockResolvedValue(true);
		(prompts.confirm as any).mockResolvedValue(true);

		await importItem("agent", "url");

		expect(prompts.confirm).toHaveBeenCalledWith(expect.objectContaining({
			message: expect.stringContaining("and 1 others"),
		}));
		expect(fs.copy).toHaveBeenCalled();
	});

	it("should cancel flatten import if user says No", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		(fs.readdir as any).mockResolvedValue(["f1"]);
		(fs.pathExists as any).mockResolvedValue(true);
		(prompts.confirm as any).mockResolvedValue(false);
		(prompts.isCancel as any).mockReturnValue(false);

		await importItem("agent", "url");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle cancel during flatten overwrite confirmation", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		(fs.readdir as any).mockResolvedValue(["f1"]);
		(fs.pathExists as any).mockResolvedValue(true);
		(prompts.confirm as any).mockResolvedValue(Symbol("cancel"));
		(prompts.isCancel as any).mockReturnValue(true);

		await importItem("agent", "url");

		expect(fs.remove).toHaveBeenCalledWith("/tmp/item");
		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
	});

	it("should cancel direct import if user says No", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		(fs.pathExists as any).mockResolvedValue(true);
		(prompts.confirm as any).mockResolvedValue(false);
		(prompts.isCancel as any).mockReturnValue(false);

		await importItem("skill", "url");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle cancel during direct overwrite confirmation", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		(fs.pathExists as any).mockResolvedValue(true);
		(prompts.confirm as any).mockResolvedValue(Symbol("cancel"));
		(prompts.isCancel as any).mockReturnValue(true);

		await importItem("skill", "url");

		expect(fs.remove).toHaveBeenCalledWith("/tmp/item");
		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
	});

	it("should handle single file import", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item.md",
			isFile: true,
		});

		await importItem("workflow", "url");

		expect(fs.copy).toHaveBeenCalledWith("/tmp/item/item.md", expect.stringContaining("item.md"), expect.anything());
	});

	it("should cleanup tempDir on error", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		(fs.ensureDir as any).mockRejectedValue(new Error("Disk error"));

		await importItem("skill", "url");

		expect(fs.remove).toHaveBeenCalledWith("/tmp/item");
		expect(prompts.cancel).toHaveBeenCalledWith(expect.stringContaining("Disk error"));
	});

	it("should normalize plural type", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		await importItem("skills", "url");
		expect(prompts.intro).toHaveBeenCalledWith(expect.stringContaining("Import skills"));
	});

	it("should throw error if tempDir is missing", async () => {
		(fetchSkillFromGitHub as any).mockResolvedValue({
			tempDir: "",
			skillName: "item",
			isFile: false,
		});
		await importItem("skill", "url");
		expect(prompts.cancel).toHaveBeenCalledWith(expect.stringContaining("Failed to create temp directory"));
	});
});