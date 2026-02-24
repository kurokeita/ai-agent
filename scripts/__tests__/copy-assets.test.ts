import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs-extra";

vi.mock("fs-extra");

describe("scripts/copy-assets.ts", () => {
	let mockExit: any;
	let mockConsoleLog: any;
	let mockConsoleError: any;

	beforeEach(() => {
		vi.resetAllMocks();
		mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
		mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("should copy all assets correctly", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		
		await import("../copy-assets.ts?test=success");

		expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining("dist"));
		expect(fs.copy).toHaveBeenCalledTimes(3);
		expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("Assets copied to dist"));
	});

	it("should exit if skills directory is missing", async () => {
		(fs.pathExists as any).mockResolvedValue(false);

		await import("../copy-assets.ts?test=missing");

		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Skills directory not found"));
		expect(mockExit).toHaveBeenCalledWith(1);
	});

	it("should handle error during copy", async () => {
		(fs.pathExists as any).mockResolvedValue(true);
		(fs.copy as any).mockRejectedValue(new Error("Copy failed"));

		await import("../copy-assets.ts?test=error");

		expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("Error copying assets:"), expect.any(Error));
		expect(mockExit).toHaveBeenCalledWith(1);
	});
});