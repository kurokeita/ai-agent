import path from "node:path";
import {
	cancel,
	confirm,
	intro,
	isCancel,
	outro,
	spinner,
} from "@clack/prompts";
import fs from "fs-extra";
import pc from "picocolors";
import { fetchSkillFromGitHub } from "../utils/github.js";
import { TYPE_DIRS } from "../utils/paths.js";

export async function importItem(type: string, url: string) {
	intro(pc.bgCyan(pc.black(` AI Manager : Import ${type} `)));

	// Normalize type
	const normalizedType = type.toLowerCase().endsWith("s")
		? type.slice(0, -1)
		: type;
	const targetBaseDir = TYPE_DIRS[normalizedType];

	if (!targetBaseDir) {
		cancel(`Unknown type: ${type}. Supported: skill, agent, workflow`);
		process.exit(1);
	}

	if (!url) {
		cancel("GitHub URL is required.");
		process.exit(1);
	}

	let tempDir: string | null = null;

	try {
		// 1. Fetch Item (using fetchSkillFromGitHub as generic fetcher)
		const s = spinner();
		s.start(`Fetching ${normalizedType} from GitHub...`);
		let itemName = "";
		let isFile = false;

		try {
			const result = await fetchSkillFromGitHub(url);
			tempDir = result.tempDir;
			if (!tempDir) throw new Error("Failed to create temp directory");
			itemName = result.skillName; // reuse property or rename if possible. assuming generic repo structure
			isFile = result.isFile;
			s.stop(pc.green(`Fetched: ${itemName}`));
		} catch (e) {
			s.stop(pc.red("Failed to fetch"));
			throw e;
		}

		// 2. Determine Target
		const shouldFlatten =
			(normalizedType === "agent" || normalizedType === "workflow") && !isFile;
		const targetPath = shouldFlatten
			? targetBaseDir
			: path.join(targetBaseDir, itemName);

		// 3. Check Existence & Confirm Overwrite
		if (shouldFlatten) {
			const srcFiles = await fs.readdir(tempDir);
			const conflicts: string[] = [];
			for (const file of srcFiles) {
				if (await fs.pathExists(path.join(targetBaseDir, file))) {
					conflicts.push(file);
				}
			}

			if (conflicts.length > 0) {
				const limit = 5;
				const displayList = conflicts.slice(0, limit).join(", ");
				const remainder = conflicts.length - limit;
				const message =
					remainder > 0
						? `Files ${displayList} (and ${remainder} others) already exist in ${targetBaseDir}. Overwrite?`
						: `Files ${displayList} already exist in ${targetBaseDir}. Overwrite?`;

				const shouldOverwrite = await confirm({
					message,
					initialValue: false,
				});

				if (isCancel(shouldOverwrite) || !shouldOverwrite) {
					if (tempDir) await fs.remove(tempDir);
					cancel("Operation cancelled.");
					process.exit(0);
				}
			}
		} else if (await fs.pathExists(targetPath)) {
			const shouldOverwrite = await confirm({
				message: `${normalizedType} '${itemName}' already exists in the repo. Overwrite?`,
				initialValue: false,
			});

			if (isCancel(shouldOverwrite) || !shouldOverwrite) {
				if (tempDir) await fs.remove(tempDir);
				cancel("Operation cancelled.");
				process.exit(0);
			}
		}

		// 4. Move/Copy to Target Directory
		s.start(`Importing ${itemName} to ${targetBaseDir}...`);
		await fs.ensureDir(targetBaseDir);
		if (isFile) {
			await fs.copy(path.join(tempDir, itemName), targetPath, {
				overwrite: true,
			});
		} else {
			if (shouldFlatten) {
				await fs.copy(tempDir, targetBaseDir, { overwrite: true });
			} else {
				await fs.copy(tempDir, targetPath, { overwrite: true });
			}
		}
		s.stop(pc.green(`Successfully imported ${itemName}!`));

		// Cleanup
		if (tempDir) {
			await fs.remove(tempDir);
		}

		outro(`${normalizedType} available at: ${targetPath}`);
	} catch (error) {
		if (tempDir) await fs.remove(tempDir);
		cancel(`An error occurred: ${error}`);
		process.exit(1);
	}
}
