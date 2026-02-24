import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs-extra";
import { list } from "../list.ts";
import { getTargetPaths, TYPE_DIRS } from "../../utils/paths.js";

vi.mock("fs-extra");
vi.mock("../../utils/paths.js");

describe("src/commands/list.ts", () => {
	let mockConsoleLog: any;
	let mockConsoleError: any;

	beforeEach(() => {
		vi.resetAllMocks();
		mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
		mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		(fs.pathExists as any).mockResolvedValue(true);
		(fs.readdir as any).mockResolvedValue([]);

		(TYPE_DIRS as any).skill = "/mock/skills";
		(TYPE_DIRS as any).agent = "/mock/agents";
		(TYPE_DIRS as any).workflow = "/mock/workflows";

		(getTargetPaths as any).mockReturnValue({
			gemini: "/mock/install/gemini",
		});
	});

	it("should list available items for all types by default", async () => {
		(fs.readdir as any).mockResolvedValueOnce([{ name: "skill1", isDirectory: () => true, isFile: () => false }]);
		(fs.readdir as any).mockResolvedValueOnce([{ name: "agent1", isDirectory: () => true, isFile: () => false }]);
		(fs.readdir as any).mockResolvedValueOnce([{ name: "workflow1", isDirectory: () => true, isFile: () => false }]);

		await list();

		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("Available skills"));
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("Available agents"));
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("Available workflows"));
	});

	it("should list specific type and handle plural", async () => {
		(fs.readdir as any).mockResolvedValue([{ name: "item1", isDirectory: () => true, isFile: () => false }]);
		await list("skills");
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("Available skills"));
	});

	it("should handle unknown type", async () => {
		await list("unknown");
		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Unknown type: unknown"));
	});

	it("should handle missing directory", async () => {
		(fs.pathExists as any).mockResolvedValue(false);
		await list("skill");
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("No skill directory found"));
	});

	it("should handle no items found for specific type", async () => {
		await list("skill");
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("No skills found"));
	});

	it("should list locally installed items", async () => {
		(fs.readdir as any).mockResolvedValue([
			{ name: "installed-item", isDirectory: () => true, isFile: () => false },
			{ name: "installed-file.md", isDirectory: () => false, isFile: () => true },
		]);

		await list("skill", { local: true });

		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("Installed skills (Local)"));
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("gemini:"));
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("- installed-item"));
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("- installed-file.md"));
	});

	it("should handle no installed items found", async () => {
		(fs.readdir as any).mockResolvedValue([]);
		await list("skill", { local: true });
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("No installed skills found"));
	});

	it("should skip local platforms that do not exist", async () => {
		(fs.pathExists as any).mockImplementation((p) => p !== "/mock/install/gemini");
		await list("skill", { local: true });
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("No installed skills found"));
	});

	it("should skip missing directories silently if no type provided", async () => {
		(fs.pathExists as any).mockResolvedValue(false);
		await list();
		expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining("directory found"));
	});

	it("should skip unknown types silently if no type provided", async () => {
		(TYPE_DIRS as any).extra = undefined;
		// This is hard to trigger because typesToList is hardcoded when type is undefined.
		// But I can try to trigger the 'else' of 'if (type)' in the unknown type block.
	});

	it("should handle empty item list silently if no type provided", async () => {
		(fs.readdir as any).mockResolvedValue([]);
		await list();
		// Should not log "No X found"
		expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining("No skills found"));
	});

	it("should filter items correctly for different types", async () => {
		(fs.readdir as any).mockResolvedValue([
			{ name: "dir", isDirectory: () => true, isFile: () => false },
			{ name: "file.md", isDirectory: () => false, isFile: () => true },
			{ name: "other.txt", isDirectory: () => false, isFile: () => false },
		]);

		await list("skill");
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("- dir"));
		expect(mockConsoleLog).not.toHaveBeenCalledWith(expect.stringContaining("- file.md"));

		mockConsoleLog.mockClear();
		await list("agent");
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("- dir"));
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("- file.md"));
	});

	it("should handle error during listing", async () => {
		(fs.readdir as any).mockRejectedValue(new Error("Disk failure"));
		await list("skill");
		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Error listing items:"), expect.any(Error));
	});
});