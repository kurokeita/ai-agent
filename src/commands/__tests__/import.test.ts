import * as prompts from "@clack/prompts";
import fs from "fs-extra";
import { type MockInstance, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSkillFromGitHub } from "../../utils/github.js";
import { TYPE_DIRS } from "../../utils/paths.js";
import { importItem } from "../import.js";

vi.mock("fs-extra");
vi.mock("@clack/prompts");
vi.mock("../../utils/github.js");
vi.mock("../../utils/paths.js");

describe("src/commands/import.ts", () => {
	let mockExit: MockInstance;

	beforeEach(() => {
		vi.resetAllMocks();
		mockExit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never);
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});

		vi.mocked(prompts.isCancel).mockReturnValue(false);
		vi.mocked(prompts.spinner).mockReturnValue({
			start: vi.fn(),
			stop: vi.fn(),
			message: vi.fn(),
		});
		// @ts-ignore
		vi.mocked(fs.pathExists).mockResolvedValue(false);
		// @ts-ignore
		vi.mocked(fs.stat).mockResolvedValue({ isFile: () => false } as fs.Stats);

		vi.mocked(TYPE_DIRS).skill = "/mock/skills";
		vi.mocked(TYPE_DIRS).agent = "/mock/agents";
		vi.mocked(TYPE_DIRS).workflow = "/mock/workflows";

		vi.mocked(prompts.confirm).mockResolvedValue(true);
	});

	it("should cancel if type is unknown", async () => {
		await importItem("unknown", "url");
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Unknown type"),
		);
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should cancel if URL is missing", async () => {
		await importItem("skill", "");
		expect(prompts.cancel).toHaveBeenCalledWith("GitHub URL is required.");
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should handle GitHub fetch failure", async () => {
		vi.mocked(fetchSkillFromGitHub).mockRejectedValue(new Error("Fetch failed"));
		await importItem("skill", "url");
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Fetch failed"),
		);
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should import skill correctly (no conflicts)", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});

		await importItem("skill", "url");

		expect(fs.copy).toHaveBeenCalledWith(
			"/tmp/item",
			expect.stringContaining("item"),
			expect.anything(),
		);
		expect(prompts.outro).toHaveBeenCalled();
	});

	it("should import skill correctly (with overwrite confirmation)", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		// @ts-ignore
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(prompts.confirm).mockResolvedValue(true);

		await importItem("skill", "url");

		expect(prompts.confirm).toHaveBeenCalled();
		expect(fs.copy).toHaveBeenCalled();
	});

	it("should cancel skill import if overwrite is declined", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		// @ts-ignore
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(prompts.confirm).mockResolvedValue(false);

		await importItem("skill", "url");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should flatten agent/workflow import", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		// @ts-ignore
		vi.mocked(fs.readdir).mockResolvedValue(["file1.md"] as never);

		await importItem("agent", "url");

		expect(fs.copy).toHaveBeenCalledWith(
			"/tmp/item",
			"/mock/agents",
			expect.anything(),
		);
	});

	it("should handle conflicts when flattening", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		// @ts-ignore
		vi.mocked(fs.readdir).mockResolvedValue([
			"f1",
			"f2",
			"f3",
			"f4",
			"f5",
			"f6",
		] as never);
		// @ts-ignore
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(prompts.confirm).mockResolvedValue(true);

		await importItem("agent", "url");

		expect(prompts.confirm).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining("and 1 others"),
			}),
		);
		expect(fs.copy).toHaveBeenCalled();
	});

	it("should cancel flatten import if user says No", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		// @ts-ignore
		vi.mocked(fs.readdir).mockResolvedValue(["f1"] as never);
		// @ts-ignore
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(prompts.confirm).mockResolvedValue(false);
		vi.mocked(prompts.isCancel).mockReturnValue(false);

		await importItem("agent", "url");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle cancel during flatten overwrite confirmation", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		// @ts-ignore
		vi.mocked(fs.readdir).mockResolvedValue(["f1"] as never);
		// @ts-ignore
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(prompts.confirm).mockResolvedValue(Symbol("cancel"));
		vi.mocked(prompts.isCancel).mockReturnValue(true);

		await importItem("agent", "url");

		expect(fs.remove).toHaveBeenCalledWith("/tmp/item");
		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
	});

	it("should cancel direct import if user says No", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		// @ts-ignore
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(prompts.confirm).mockResolvedValue(false);
		vi.mocked(prompts.isCancel).mockReturnValue(false);

		await importItem("skill", "url");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle cancel during direct overwrite confirmation", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		// @ts-ignore
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(prompts.confirm).mockResolvedValue(Symbol("cancel"));
		vi.mocked(prompts.isCancel).mockReturnValue(true);

		await importItem("skill", "url");

		expect(fs.remove).toHaveBeenCalledWith("/tmp/item");
		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
	});

	it("should handle single file import", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item.md",
			isFile: true,
		});

		await importItem("workflow", "url");

		expect(fs.copy).toHaveBeenCalledWith(
			"/tmp/item/item.md",
			expect.stringContaining("item.md"),
			expect.anything(),
		);
	});

	it("should cleanup tempDir on error", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		vi.mocked(fs.ensureDir).mockRejectedValue(new Error("Disk error") as never);

		await importItem("skill", "url");

		expect(fs.remove).toHaveBeenCalledWith("/tmp/item");
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Disk error"),
		);
	});

	it("should normalize plural type", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "/tmp/item",
			skillName: "item",
			isFile: false,
		});
		await importItem("skills", "url");
		expect(prompts.intro).toHaveBeenCalledWith(
			expect.stringContaining("Import skills"),
		);
	});

	it("should throw error if tempDir is missing", async () => {
		vi.mocked(fetchSkillFromGitHub).mockResolvedValue({
			tempDir: "",
			skillName: "item",
			isFile: false,
		});
		await importItem("skill", "url");
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("Failed to create temp directory"),
		);
	});
});
