import * as prompts from "@clack/prompts";
import fs from "fs-extra";
import {
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";
import {
	getTargetPaths,
	PLATFORM_LABELS,
	type Platform,
} from "../../utils/paths.js";
import { remove } from "../remove.js";

vi.mock("fs-extra");
vi.mock("@clack/prompts");
vi.mock("../../utils/paths.js");

describe("src/commands/remove.ts", () => {
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
		vi.mocked(fs.pathExists).mockResolvedValue(true as never);
		vi.mocked(fs.readdir).mockResolvedValue([] as never);

		vi.mocked(getTargetPaths).mockReturnValue({
			gemini: "/mock/install/gemini",
			copilot: "/mock/install/copilot",
		});
		vi.mocked(PLATFORM_LABELS).gemini = "Gemini CLI";
		vi.mocked(PLATFORM_LABELS).copilot = "GitHub Copilot";

		vi.mocked(prompts.confirm).mockResolvedValue(true);
	});

	it("should cancel if no items are found", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([] as never);
		await remove("skill");
		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("No installed skills found"),
		);
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle item selection and removal", async () => {
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "skill1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["skill1"]) // Items
			.mockResolvedValueOnce(["gemini"]); // Platforms

		await remove("skill");

		expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining("skill1"));
		expect(prompts.outro).toHaveBeenCalled();
	});

	it("should handle cancel during item selection", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "skill1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect).mockResolvedValue(Symbol("cancel"));
		vi.mocked(prompts.isCancel).mockReturnValue(true);

		await remove("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle cancel during platform selection", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "skill1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["skill1"])
			.mockResolvedValueOnce(Symbol("cancel"));
		vi.mocked(prompts.isCancel)
			.mockReturnValueOnce(false) // item selection
			.mockReturnValueOnce(true); // platform selection

		await remove("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle user saying No during confirmation", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "skill1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["skill1"])
			.mockResolvedValueOnce(["gemini"]);
		vi.mocked(prompts.confirm).mockResolvedValue(false);

		await remove("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle cancel during confirmation", async () => {
		vi.mocked(fs.readdir).mockResolvedValue([
			{
				name: "skill1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["skill1"])
			.mockResolvedValueOnce(["gemini"]);
		vi.mocked(prompts.confirm).mockResolvedValue(Symbol("cancel"));
		vi.mocked(prompts.isCancel).mockImplementation(
			(v) => typeof v === "symbol",
		);

		await remove("skill");

		expect(prompts.cancel).toHaveBeenCalledWith("Operation cancelled.");
		expect(mockExit).toHaveBeenCalledWith(0);
	});

	it("should handle items not found on specific platforms", async () => {
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "skill1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["skill1"])
			.mockResolvedValueOnce(["gemini", "copilot"]);

		// Only exists on gemini
		vi.mocked(fs.pathExists).mockImplementation((p) =>
			Promise.resolve(p.includes("gemini")),
		);

		await remove("skill");

		expect(fs.remove).toHaveBeenCalledTimes(1);
		expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining("gemini"));
	});

	it("should handle removal errors", async () => {
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "skill1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["skill1"])
			.mockResolvedValueOnce(["gemini"]);
		vi.mocked(fs.remove).mockRejectedValue(
			new Error("Permission denied") as never,
		);

		await remove("skill");

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Errors encountered"),
		);
	});

	it("should handle non-Error throws in loop", async () => {
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "skill1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["skill1"])
			.mockResolvedValueOnce(["gemini"]);
		vi.mocked(fs.remove).mockRejectedValue("String error" as never);

		await remove("skill");

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("skill1 (gemini): String error"),
		);
	});

	it("should filter items correctly for agents/workflows", async () => {
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "dir",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
			{
				name: "wf.md",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
			{
				name: "other.txt",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["dir", "wf.md"])
			.mockResolvedValueOnce(["gemini"]);

		await remove("workflow");

		expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining("dir"));
		expect(fs.remove).toHaveBeenCalledWith(expect.stringContaining("wf.md"));
	});

	it("should handle plural normalization", async () => {
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "item",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item"])
			.mockResolvedValueOnce(["gemini"]);

		await remove("skills");

		expect(prompts.intro).toHaveBeenCalledWith(
			expect.stringContaining("Remove skills"),
		);
	});

	it("should skip platforms that do not exist during scan", async () => {
		vi.mocked(getTargetPaths).mockReturnValue({
			p1: "/non-existent",
			gemini: "/mock/install/gemini",
		} as unknown as Record<Platform, string>);
		vi.mocked(fs.pathExists).mockImplementation((p) =>
			Promise.resolve(p === "/mock/install/gemini"),
		);
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "item1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["gemini"]);

		await remove("skill");

		expect(prompts.spinner().stop).toHaveBeenCalledWith(
			expect.stringContaining("Found 1 unique"),
		);
	});

	it("should skip unsupported platforms during removal", async () => {
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "item1",
				isDirectory: () => true,
				isFile: () => false,
			} as fs.Dirent,
		] as never);
		vi.mocked(prompts.multiselect)
			.mockResolvedValueOnce(["item1"])
			.mockResolvedValueOnce(["gemini", "unsupported"]);

		vi.mocked(getTargetPaths).mockReturnValue({
			gemini: "/mock/install/gemini",
			// 'unsupported' is missing here
		} as unknown as Record<Platform, string>);

		await remove("skill");

		expect(fs.remove).toHaveBeenCalledTimes(1);
	});

	it("should filter out non-agent/workflow files", async () => {
		vi.mocked(fs.readdir).mockResolvedValueOnce([
			{
				name: "file.txt",
				isDirectory: () => false,
				isFile: () => true,
			} as fs.Dirent,
		] as never);

		await remove("agent");

		expect(prompts.cancel).toHaveBeenCalledWith(
			expect.stringContaining("No installed agents found"),
		);
	});
});
