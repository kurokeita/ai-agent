import fs from "fs-extra";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSkillFromGitHub } from "../github.js";

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

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockFiles,
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => "content1",
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockSubDirFiles,
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => "content2",
			} as Response);

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

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockFile,
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => "file content",
			} as Response);

		const result = await fetchSkillFromGitHub(mockUrl);

		expect(result.isFile).toBe(true);
		expect(fs.writeFile).toHaveBeenCalledWith(
			expect.stringContaining("file.ts"),
			"file content",
		);
	});

	it("should throw error if initial API fetch fails", async () => {
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: false,
			status: 404,
			statusText: "Not Found",
		} as Response);

		await expect(fetchSkillFromGitHub(mockUrl)).rejects.toThrow(
			"Failed to fetch from GitHub (404): Not Found",
		);
	});

	it("should throw error for invalid response format", async () => {
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ invalid: "data" }),
		} as Response);

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

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockFile,
			} as Response)
			.mockResolvedValueOnce({
				ok: false,
				statusText: "Error downloading file",
			} as Response);

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

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockFiles,
			} as Response)
			.mockResolvedValueOnce({
				ok: false,
				statusText: "Download failed",
			} as Response);

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

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => mockFile,
		} as Response);

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

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => mockFiles,
		} as Response);

		await fetchSkillFromGitHub(mockUrl);

		expect(fs.writeFile).not.toHaveBeenCalled();
		expect(fs.ensureDir).toHaveBeenCalledTimes(1); // Only for tempDir
	});
});
