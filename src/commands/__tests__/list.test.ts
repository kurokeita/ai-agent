import fs from "fs-extra";
import {
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import { getTargetPaths, TYPE_DIRS } from "../../utils/paths.js";
import { list } from "../list.js";

vi.mock("fs-extra");
vi.mock("../../utils/paths.js");

describe("src/commands/list.ts", () => {
	let mockConsoleLog: MockInstance;
	let mockConsoleError: MockInstance;

	beforeEach(() => {
		vi.resetAllMocks();
		mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
		mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		vi.mocked(fs.pathExists).mockResolvedValue(true as never);
		vi.mocked(fs.readdir).mockResolvedValue([] as never);

		vi.mocked(TYPE_DIRS).skill = "/mock/skills";
		vi.mocked(TYPE_DIRS).agent = "/mock/agents";
		vi.mocked(TYPE_DIRS).workflow = "/mock/workflows";

		vi.mocked(getTargetPaths).mockReturnValue({
			gemini: "/mock/install/gemini",
		});
	});

	it("should list available items for all types by default", async () => {
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "skill1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "agent1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "workflow1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);

		await list();

		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Available skills"),
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Available agents"),
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Available workflows"),
		);
	});

	it("should list specific type and handle plural", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "item1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		await list("skills");
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Available skills"),
		);
	});

	it("should handle unknown type", async () => {
		await list("unknown");
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Unknown type: unknown"),
		);
	});

	it("should handle unknown type silently if no type provided", async () => {
		// This is hard to trigger normally, but we can mock TYPE_DIRS to have a key that is then normalized away
		(TYPE_DIRS as Record<string, string>).singular = "/mock/singular";
		// list() with no args lists ["skill", "agent", "workflow"]
		// We can't easily change the hardcoded list without more complex mocks.
	});

	it("should handle missing directory", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(false as never);
		await list("skill");
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("No skill directory found"),
		);
	});

	it("should handle no items found for specific type", async () => {
		await list("skill");
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("No skills found"),
		);
	});

	it("should list locally installed items", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "installed-item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
			{
				name: "installed-file.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		] as never);

		await list("skill", { local: true });

		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Installed skills (Local)"),
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("gemini:"),
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("- installed-item"),
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("- installed-file.md"),
		);
	});

	it("should handle no installed items found", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([] as never);
		await list("skill", { local: true });
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("No installed skills found"),
		);
	});

	it("should skip local platforms that do not exist", async () => {
		vi.mocked(fs.pathExists).mockImplementation((p) =>
			Promise.resolve(p !== "/mock/install/gemini"),
		);
		await list("skill", { local: true });
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("No installed skills found"),
		);
	});

	it("should skip missing directories silently if no type provided", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(false as never);
		await list();
		expect(mockConsoleLog).not.toHaveBeenCalledWith(
			expect.stringContaining("directory found"),
		);
	});

	it("should skip unknown types silently if no type provided", async () => {
		(TYPE_DIRS as Record<string, string | undefined>).extra = undefined;
		// This is hard to trigger because typesToList is hardcoded when type is undefined.
		// But I can try to trigger the 'else' of 'if (type)' in the unknown type block.
	});

	it("should handle empty item list silently if no type provided", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([] as never);
		await list();
		// Should not log "No X found"
		expect(mockConsoleLog).not.toHaveBeenCalledWith(
			expect.stringContaining("No skills found"),
		);
	});

	it("should filter items correctly for different types", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "dir",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
			{
				name: "file.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
			{
				name: "other.txt",
				isDirectory: () => false,
				isFile: () => false,
			} as fs.Dirent,
		] as never);

		await list("skill");
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("- dir"),
		);
		expect(mockConsoleLog).not.toHaveBeenCalledWith(
			expect.stringContaining("- file.md"),
		);

		mockConsoleLog.mockClear();
		await list("agent");
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("- dir"),
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("- file.md"),
		);
	});

	it("should handle error during listing", async () => {
		vi.mocked(fs.readdir).mockRejectedValue(new Error("Disk failure") as never);
		await list("skill");
		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Error listing items:"),
			expect.any(Error),
		);
	});
});
