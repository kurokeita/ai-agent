import os from "node:os";
import fs from "fs-extra";
import {
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest";

vi.mock("fs-extra");
vi.mock("@/utils/paths.js", () => ({
	PLATFORM_LABELS: { p1: "Platform 1", p2: "Platform 2" },
	PLATFORM_PATHS_SKILLS: { p1: "/home/user/skills" }, // p2 missing
	PLATFORM_PATHS_AGENTS: { p1: "/home/user/agents" }, // p2 missing
	PLATFORM_PATHS_WORKFLOWS: { p1: "/home/user/workflows" }, // p2 missing
}));

describe("scripts/update-readme.ts", () => {
	let mockExit: MockInstance;
	let mockConsoleLog: MockInstance;
	let mockConsoleError: MockInstance;

	beforeEach(() => {
		vi.resetAllMocks();
		mockExit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never);
		mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
		mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(os, "homedir").mockReturnValue("/home/user");
	});

	it("should update README with supported platforms table", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.readFile).mockResolvedValue(
			"<!-- SUPPORTED_AGENTS_START --><!-- SUPPORTED_AGENTS_END -->",
		);

		await import("../update-readme.js?test=success");

		expect(fs.writeFile).toHaveBeenCalledWith(
			expect.stringContaining("README.md"),
			expect.stringContaining("| Gemini CLI |"),
		);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("README.md updated successfully"),
		);
	});

	it("should exit if README.md is missing", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(false);

		await import("../update-readme.js?test=missing");

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("README.md not found"),
		);
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should exit if markers are missing", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.readFile).mockResolvedValue("No markers here");

		await import("../update-readme.js?test=markers");

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Markers not found"),
		);
		expect(mockExit).toHaveBeenCalledWith(1);
	});
});
