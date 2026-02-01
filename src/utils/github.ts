import os from "node:os";
import path from "node:path";
import fs from "fs-extra";

export interface GitHubFile {
	name: string;
	path: string;
	sha: string;
	size: number;
	url: string;
	html_url: string;
	git_url: string;
	download_url: string | null;
	type: string;
	_links: {
		self: string;
		git: string;
		html: string;
	};
}

export async function fetchSkillFromGitHub(url: string): Promise<{
	tempDir: string;
	skillName: string;
	isFile: boolean;
}> {
	const regex = /github\.com\/([^/]+)\/([^/]+)\/(?:tree|blob)\/([^/]+)\/(.+)/;
	const match = url.match(regex);

	if (!match) {
		throw new Error(
			"Invalid GitHub URL. Format: https://github.com/owner/repo/tree/branch/path/to/skill or blob/branch/path/to/file",
		);
	}

	const [, owner, repo, ref, skillPath] = match;
	const skillName = path.basename(skillPath);
	const initialApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${skillPath}?ref=${ref}`;

	const tempDir = path.join(os.tmpdir(), "ai-agents-install", skillName);
	await fs.ensureDir(tempDir);
	await fs.emptyDir(tempDir);

	let isFile = false;

	async function downloadDirectory(apiUrl: string, localDir: string) {
		const response = await fetch(apiUrl, {
			headers: {
				"User-Agent": "ai-agents-cli",
				Accept: "application/vnd.github.v3+json",
			},
		});

		if (!response.ok) {
			throw new Error(
				`Failed to fetch from GitHub (${response.status}): ${response.statusText}`,
			);
		}

		const data = await response.json();

		// Handle single file response
		if (!Array.isArray(data) && (data as GitHubFile).type === "file") {
			isFile = true;
			const item = data as GitHubFile;
			if (item.download_url) {
				const fileContentResponse = await fetch(item.download_url);
				if (!fileContentResponse.ok) {
					throw new Error(
						`Failed to download ${item.name}: ${fileContentResponse.statusText}`,
					);
				}
				const content = await fileContentResponse.text();
				await fs.writeFile(path.join(localDir, item.name), content);
			}
			return;
		}

		if (!Array.isArray(data)) {
			throw new Error(
				"Invalid response from GitHub API. Expected directory listing or file object.",
			);
		}

		const files = data as GitHubFile[];

		for (const item of files) {
			if (item.type === "file" && item.download_url) {
				const fileContentResponse = await fetch(item.download_url);
				if (!fileContentResponse.ok) {
					console.warn(
						`Failed to download ${item.name}: ${fileContentResponse.statusText}`,
					);
					continue;
				}
				const content = await fileContentResponse.text();
				await fs.writeFile(path.join(localDir, item.name), content);
			} else if (item.type === "dir") {
				const newLocalDir = path.join(localDir, item.name);
				await fs.ensureDir(newLocalDir);
				await downloadDirectory(item.url, newLocalDir);
			}
		}
	}

	await downloadDirectory(initialApiUrl, tempDir);

	return { tempDir, skillName, isFile };
}
