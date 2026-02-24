import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs-extra";
import os from "node:os";

vi.mock("fs-extra");
vi.mock("../src/utils/paths.js", () => ({
    PLATFORM_LABELS: { p1: "Platform 1", p2: "Platform 2" },
    PLATFORM_PATHS_SKILLS: { p1: "/home/user/skills" }, // p2 missing
    PLATFORM_PATHS_AGENTS: { p1: "/home/user/agents" }, // p2 missing
    PLATFORM_PATHS_WORKFLOWS: { p1: "/home/user/workflows" } // p2 missing
}));

describe("scripts/update-readme.ts", () => {
	let mockExit: any;
	let mockConsoleLog: any;
	let mockConsoleError: any;

	beforeEach(() => {
		vi.resetAllMocks();
		mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
		mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(os, "homedir").mockReturnValue("/home/user");
	});

	it("should update README with supported platforms table", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
        (fs.readFile as any).mockResolvedValue("<!-- SUPPORTED_AGENTS_START --><!-- SUPPORTED_AGENTS_END -->");
		
		await import("../update-readme.ts?test=success");

		expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining("README.md"), expect.stringContaining("| Gemini CLI |"));
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("README.md updated successfully"));
	});

	it("should exit if README.md is missing", async () => {
		(fs.pathExists as any).mockResolvedValue(false);

		await import("../update-readme.ts?test=missing");

		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("README.md not found"));
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should exit if markers are missing", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
        (fs.readFile as any).mockResolvedValue("No markers here");

		await import("../update-readme.ts?test=markers");

		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Markers not found"));
		expect(mockExit).toHaveBeenCalledWith(1);
	});
});