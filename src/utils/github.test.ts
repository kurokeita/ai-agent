import os from "node:os";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs-extra";
import { fetchSkillFromGitHub } from "./github.ts";

vi.mock("fs-extra");

describe("src/utils/github.ts", () => {
	const mockUrl = "https://github.com/owner/repo/tree/main/path/to/skill";

	beforeEach(() => {
		vi.clearAllMocks();
		global.fetch = vi.fn();
	});

	it("should throw error for invalid GitHub URL", async () => {
		const invalidUrl = "https://invalid.url";
		await expect(fetchSkillFromGitHub(invalidUrl)).rejects.toThrow(
			"Invalid GitHub URL",
		);
	});

	it("should download a directory correctly", async () => {
		const mockFiles = [
			{
				name: "file1.ts",
				type: "file",
				download_url: "https://download.file1.ts",
				url: "https://api.file1.ts",
			},
			{
				name: "subdir",
				type: "dir",
				url: "https://api.subdir",
			},
		];

		const mockSubDirFiles = [
			{
				name: "file2.ts",
				type: "file",
				download_url: "https://download.file2.ts",
				url: "https://api.file2.ts",
			},
		];

		(global.fetch as any)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockFiles,
			})
			.mockResolvedValueOnce({
				ok: true,
				text: async () => "content1",
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockSubDirFiles,
			})
			.mockResolvedValueOnce({
				ok: true,
				text: async () => "content2",
			});

		const result = await fetchSkillFromGitHub(mockUrl);

		expect(result.skillName).toBe("skill");
		expect(result.isFile).toBe(false);
		expect(fs.ensureDir).toHaveBeenCalled();
		expect(fs.writeFile).toHaveBeenCalledWith(
			expect.stringContaining("file1.ts"),
			"content1",
		);
		expect(fs.writeFile).toHaveBeenCalledWith(
			expect.stringContaining("file2.ts"),
			"content2",
		);
	});

	it("should handle single file response", async () => {
		const mockFile = {
			name: "file.ts",
			type: "file",
			download_url: "https://download.file.ts",
		};

		(global.fetch as any)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockFile,
			})
			.mockResolvedValueOnce({
				ok: true,
				text: async () => "file content",
			});

		const result = await fetchSkillFromGitHub(mockUrl);

		expect(result.isFile).toBe(true);
		expect(fs.writeFile).toHaveBeenCalledWith(
			expect.stringContaining("file.ts"),
			"file content",
		);
	});

	it("should throw error if initial API fetch fails", async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
		});

		await expect(fetchSkillFromGitHub(mockUrl)).rejects.toThrow(
			"Failed to fetch from GitHub (404): Not Found",
		);
	});

	it("should throw error for invalid response format", async () => {
		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ invalid: "data" }),
		});

		await expect(fetchSkillFromGitHub(mockUrl)).rejects.toThrow(
			"Invalid response from GitHub API",
		);
	});

	it("should throw error if file download fails", async () => {
		const mockFile = {
			name: "file.ts",
			type: "file",
			download_url: "https://download.file.ts",
		};

		(global.fetch as any)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockFile,
			})
			.mockResolvedValueOnce({
				ok: false,
				statusText: "Error downloading file",
			});

		await expect(fetchSkillFromGitHub(mockUrl)).rejects.toThrow(
			"Failed to download file.ts: Error downloading file",
		);
	});

	it("should warn and continue if file download fails in directory", async () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const mockFiles = [
			{
				name: "failed_file.ts",
				type: "file",
				download_url: "https://download.failed.ts",
			},
		];

		(global.fetch as any)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockFiles,
			})
			.mockResolvedValueOnce({
				ok: false,
				statusText: "Download failed",
			});

		await fetchSkillFromGitHub(mockUrl);

		expect(consoleSpy).toHaveBeenCalledWith(
			"Failed to download failed_file.ts: Download failed",
		);
		consoleSpy.mockRestore();
	});

	it("should handle single file with null download_url", async () => {
		const mockFile = {
			name: "file.ts",
			type: "file",
			download_url: null,
		};

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockFile,
		});

		const result = await fetchSkillFromGitHub(mockUrl);

		expect(result.isFile).toBe(true);
		expect(fs.writeFile).not.toHaveBeenCalled();
	});

	it("should skip items that are neither file nor dir", async () => {
		const mockFiles = [
			{
				name: "symlink",
				type: "symlink",
				download_url: null,
			},
		];

		(global.fetch as any).mockResolvedValueOnce({
			ok: true,
			json: async () => mockFiles,
		});

		await fetchSkillFromGitHub(mockUrl);

		expect(fs.writeFile).not.toHaveBeenCalled();
		expect(fs.ensureDir).toHaveBeenCalledTimes(1); // Only for tempDir
	});
});
