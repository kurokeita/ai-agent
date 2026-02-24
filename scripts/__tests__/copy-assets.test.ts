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

describe("scripts/copy-assets.ts", () => {
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
	});

	it("should copy all assets correctly", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);

		await import("../copy-assets.js?test=success");

		expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining("dist"));
		expect(fs.copy).toHaveBeenCalledTimes(3);
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Assets copied to dist"),
		);
	});

	it("should exit if skills directory is missing", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(false);

		await import("../copy-assets.js?test=missing");

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Skills directory not found"),
		);
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should handle error during copy", async () => {
		vi.mocked(fs.pathExists).mockResolvedValue(true);
		vi.mocked(fs.copy).mockRejectedValue(new Error("Copy failed") as never);

		await import("../copy-assets.js?test=error");

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Error copying assets:"),
			expect.any(Error),
		);
		expect(mockExit).toHaveBeenCalledWith(1);
	});
});
