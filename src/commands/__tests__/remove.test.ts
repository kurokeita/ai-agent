import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs-extra";
import * as prompts from "@clack/prompts";
import { remove } from "../remove.ts";
import { getTargetPaths, PLATFORM_LABELS } from "../../utils/paths.js";

vi.mock("fs-extra");
vi.mock("@clack/prompts");
vi.mock("../../utils/paths.js");

describe("src/commands/remove.ts", () => {
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
		(fs.readdir as any).mockResolvedValue([]);

		(getTargetPaths as any).mockReturnValue({
			gemini: "/mock/install/gemini",
			copilot: "/mock/install/copilot",
		});
		(PLATFORM_LABELS as any).gemini = "Gemini CLI";
		(PLATFORM_LABELS as any).copilot = "GitHub Copilot";

		(prompts.confirm as any).mockResolvedValue(true);
	});

	it("should cancel if no items are found", async () => {
		(fs.readdir as any).mockResolvedValue([]);
		await remove("skill");
		expect(prompts.cancel).toHaveBeenCalledWith(expect.stringContaining("No installed skills found"));
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle item selection and removal", async () => {
		(fs.readdir as any).mockResolvedValueOnce([{ name: "skill1", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any)
			.mockResolvedValueOnce(["skill1"]) // Items
			.mockResolvedValueOnce(["gemini"]); // Platforms

		await remove("skill");

		expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining("skill1"));
		expect(prompts.outro).toHaveBeenCalled();
	});

	it("should handle cancel during item selection", async () => {
		(fs.readdir as any).mockResolvedValue([{ name: "skill1", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValue(Symbol("cancel"));
		(prompts.isCancel as any).mockReturnValue(true);

		await remove("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle cancel during platform selection", async () => {
		(fs.readdir as any).mockResolvedValue([{ name: "skill1", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any)
			.mockResolvedValueOnce(["skill1"])
			.mockResolvedValueOnce(Symbol("cancel"));
		(prompts.isCancel as any)
			.mockReturnValueOnce(false) // item selection
			.mockReturnValueOnce(true); // platform selection

		await remove("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle user saying No during confirmation", async () => {
		(fs.readdir as any).mockResolvedValue([{ name: "skill1", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["skill1"]).mockResolvedValueOnce(["gemini"]);
		(prompts.confirm as any).mockResolvedValue(false);

		await remove("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle cancel during confirmation", async () => {
		(fs.readdir as any).mockResolvedValue([{ name: "skill1", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["skill1"]).mockResolvedValueOnce(["gemini"]);
		(prompts.confirm as any).mockResolvedValue(Symbol("cancel"));
		(prompts.isCancel as any).mockImplementation((v) => typeof v === "symbol");

		await remove("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle items not found on specific platforms", async () => {
		(fs.readdir as any).mockResolvedValueOnce([{ name: "skill1", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["skill1"]).mockResolvedValueOnce(["gemini", "copilot"]);
		
		// Only exists on gemini
		(fs.pathExists as any).mockImplementation((p) => p.includes("gemini"));

		await remove("skill");

		expect(fs.remove).toHaveBeenCalledTimes(1);
		expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining("gemini"));
	});

	it("should handle removal errors", async () => {
		(fs.readdir as any).mockResolvedValueOnce([{ name: "skill1", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["skill1"]).mockResolvedValueOnce(["gemini"]);
		(fs.remove as any).mockRejectedValue(new Error("Permission denied"));

		await remove("skill");

		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Errors encountered"));
	});

	it("should handle non-Error throws in loop", async () => {
		(fs.readdir as any).mockResolvedValueOnce([{ name: "skill1", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["skill1"]).mockResolvedValueOnce(["gemini"]);
		(fs.remove as any).mockRejectedValue("String error");

		await remove("skill");

		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("skill1 (gemini): String error"));
	});

	it("should filter items correctly for agents/workflows", async () => {
		(fs.readdir as any).mockResolvedValueOnce([
			{ name: "dir", isDirectory: () => true, isFile: () => false },
			{ name: "wf.md", isDirectory: () => false, isFile: () => true },
			{ name: "other.txt", isDirectory: () => false, isFile: () => true },
		]);
		(prompts.multiselect as any).mockResolvedValueOnce(["dir", "wf.md"]).mockResolvedValueOnce(["gemini"]);

		await remove("workflow");

		expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining("dir"));
		expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining("wf.md"));
	});

	it("should handle plural normalization", async () => {
		(fs.readdir as any).mockResolvedValueOnce([{ name: "item", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["item"]).mockResolvedValueOnce(["gemini"]);

		await remove("skills");

		expect(prompts.intro).toHaveBeenCalledWith(expect.stringContaining("Remove skills"));
	});

	it("should skip platforms that do not exist during scan", async () => {
		(getTargetPaths as any).mockReturnValue({
			p1: "/non-existent",
			gemini: "/mock/install/gemini"
		});
		(fs.pathExists as any).mockImplementation((p) => p === "/mock/install/gemini");
		(fs.readdir as any).mockResolvedValueOnce([{ name: "item1", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any).mockResolvedValueOnce(["item1"]).mockResolvedValueOnce(["gemini"]);

		await remove("skill");

		expect(prompts.spinner().stop).toHaveBeenCalledWith(expect.stringContaining("Found 1 unique"));
	});

	it("should skip unsupported platforms during removal", async () => {
		(fs.readdir as any).mockResolvedValueOnce([{ name: "item1", isDirectory: () => true, isFile: () => false }]);
		(prompts.multiselect as any)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["gemini", "unsupported"]);
		
		(getTargetPaths as any).mockReturnValue({
			gemini: "/mock/install/gemini"
			// 'unsupported' is missing here
		});

		await remove("skill");

		expect(fs.remove).toHaveBeenCalledTimes(1);
	});

	it("should filter out non-agent/workflow files", async () => {
		(fs.readdir as any).mockResolvedValueOnce([
			{ name: "file.txt", isDirectory: () => false, isFile: () => true }
		]);
		
		await remove("agent");

		expect(prompts.cancel).toHaveBeenCalledWith(expect.stringContaining("No installed agents found"));
	});
});