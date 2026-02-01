import os from "node:os";
import path from "node:path";

import {
	cancel,
	confirm,
	intro,
	isCancel,
	multiselect,
	note,
	outro,
	spinner,
} from "@clack/prompts";
import fs from "fs-extra";
import pc from "picocolors";
import { fetchSkillFromGitHub } from "../utils/github.js";

import {
	getTargetPaths,
	PLATFORM_LABELS,
	type Platform,
	TYPE_DIRS,
} from "../utils/paths.js";

function getPlatformOptions(type: string) {
	const paths = getTargetPaths(type);
	return Object.entries(paths).map(([platform, pathStr]) => ({
		label: PLATFORM_LABELS[platform as Platform],
		value: platform,
		hint: pathStr.replace(os.homedir(), "~"),
	}));
}

async function installItem(
	itemName: string,
	overwrite: boolean,
	sourcePath: string,
	targetBaseDir: string,
): Promise<boolean> {
	const targetPath = path.join(targetBaseDir, itemName);

	if (!(await fs.pathExists(sourcePath))) {
		throw new Error(`Item '${itemName}' not found at ${sourcePath}`);
	}

	if (!overwrite && (await fs.pathExists(targetPath))) {
		return false;
	}

	await fs.ensureDir(targetBaseDir);
	await fs.copy(sourcePath, targetPath, { overwrite });
	return true;
}

export async function add(type: string, url?: string) {
	intro(pc.bgCyan(pc.black(` AI Manager : Add ${type} `)));

	// Normalize type
	const normalizedType = type.toLowerCase().endsWith("s")
		? type.slice(0, -1)
		: type;
	if (!TYPE_DIRS[normalizedType]) {
		cancel(`Unknown type: ${type}. Supported: skill, agent, workflow`);
		process.exit(1);
	}

	let tempDir: string | null = null;
	let selectedItems: string[] = [];

	try {
		// 1. Determine Source (Local vs GitHub)
		if (url) {
			const s = spinner();
			s.start(`Fetching ${normalizedType} from GitHub...`);
			try {
				const result = await fetchSkillFromGitHub(url);
				tempDir = result.tempDir;
				selectedItems = [result.skillName];
				s.stop(pc.green(`Fetched ${normalizedType}: ${result.skillName}`));
			} catch (e) {
				s.stop(pc.red("Failed to fetch"));
				throw e;
			}
		} else {
			// Local Selection Logic
			const sourceDir = TYPE_DIRS[normalizedType];
			if (!(await fs.pathExists(sourceDir))) {
				cancel(`${normalizedType} directory not found!`);
				process.exit(1);
			}

			const entries = await fs.readdir(sourceDir, { withFileTypes: true });
			const availableItems = entries
				.filter(
					(entry) =>
						entry.isDirectory() ||
						((normalizedType === "workflow" || normalizedType === "agent") &&
							entry.isFile() &&
							entry.name.endsWith(".md")),
				)
				.map((entry) => ({ label: entry.name, value: entry.name }))
				.sort((a, b) => a.label.localeCompare(b.label));

			if (availableItems.length === 0) {
				cancel(`No ${normalizedType}s found in directory.`);
				process.exit(0);
			}

			// Select Items
			const items = await multiselect({
				message: `Select ${normalizedType}s to install:`,
				options: availableItems,
				required: true,
			});

			if (isCancel(items)) {
				cancel("Operation cancelled.");
				process.exit(0);
			}
			selectedItems = items as string[];
		}

		// 2. Select Platforms
		// Filter platform options based on support for the type
		const supportedPaths = getTargetPaths(normalizedType);
		const currentPlatformOptions = getPlatformOptions(normalizedType);

		if (currentPlatformOptions.length === 0) {
			cancel(`No supported platforms found for type '${normalizedType}'.`);
			process.exit(1);
		}

		const platforms = await multiselect({
			message: "Select target platforms:",
			options: currentPlatformOptions,
			required: true,
		});

		if (isCancel(platforms)) {
			console.log("Cleaning up...");
			if (tempDir) await fs.remove(tempDir);
			cancel("Operation cancelled.");
			process.exit(0);
		}

		const selectedPlatforms = platforms as Platform[];

		// 3. Check for existing items
		const existingItems: { item: string; platform: Platform }[] = [];
		for (const platform of selectedPlatforms) {
			const targetBase = supportedPaths[platform];
			if (!targetBase) continue;

			for (const item of selectedItems) {
				const targetPath = path.join(targetBase, item);
				if (await fs.pathExists(targetPath)) {
					existingItems.push({ item, platform });
				}
			}
		}

		let overwrite = true;
		if (existingItems.length > 0) {
			const limit = 5;
			const displayList = existingItems
				.slice(0, limit)
				.map((e) => `${pc.bold(e.item)} (${e.platform})`)
				.join(", ");
			const remainder = existingItems.length - limit;
			const message =
				remainder > 0
					? `The following items already exist: ${displayList}, and ${remainder} others.`
					: `The following items already exist: ${displayList}.`;

			note(message, "Attention");

			const shouldOverwrite = await confirm({
				message: "Do you want to overwrite existing items?",
				initialValue: false,
			});

			if (isCancel(shouldOverwrite)) {
				if (tempDir) await fs.remove(tempDir);
				cancel("Operation cancelled.");
				process.exit(0);
			}

			overwrite = shouldOverwrite as boolean;
		}

		// 4. Confirmation Note
		note(
			`Installing ${selectedItems.length} ${normalizedType}s to ${selectedPlatforms.length} platforms...`,
			"Summary",
		);

		// 5. Installation Loop with Spinner
		const s = spinner();
		s.start("Installing...");

		const errors: string[] = [];
		let installedCount = 0;
		let skippedCount = 0;

		for (const platform of selectedPlatforms) {
			const targetBase = supportedPaths[platform];
			if (!targetBase) continue;

			for (const item of selectedItems) {
				const message = `Installing ${pc.bold(item)} to ${pc.cyan(platform)}...`;
				s.message(message);

				try {
					if (url && tempDir) {
						// We already fetched it, check if it was a file
						// Wait, fetchSkillFromGitHub returned isFile, but add command logic separated fetch from install loop.
						// We need to store isFile state from fetch if using URL.
						// However, selectedItems only stores strings.
						// Let's assume if it is a URL, we re-verify or change logic slightly.
						// Better: modify fetch logic above to store isFile.
					}

					// Re-implementing logic to be consistent with import.ts
					// But wait, add command handles multiple items if LOCAL.
					// If URL, it is single item `selectedItems = [result.skillName]`.

					let currentSourcePath: string;

					if (url && tempDir) {
						// For URL fetch, we need to know if it was a file.
						// We can check if tempDir/item exists as file.
						const potentialFile = path.join(tempDir, item);
						if (
							(await fs.pathExists(potentialFile)) &&
							(await fs.stat(potentialFile)).isFile()
						) {
							currentSourcePath = potentialFile;
						} else {
							currentSourcePath = tempDir;
						}
					} else {
						// Local source
						const src = path.join(TYPE_DIRS[normalizedType], item);
						if ((await fs.stat(src)).isFile()) {
							currentSourcePath = src;
						} else {
							currentSourcePath = src; // direct path to dir
						}
					}

					const installed = await installItem(
						item,
						overwrite,
						currentSourcePath,
						targetBase,
					);
					if (installed) {
						installedCount++;
					} else {
						skippedCount++;
					}
				} catch (err: unknown) {
					const errorMessage = err instanceof Error ? err.message : String(err);
					errors.push(`${item} -> ${platform}: ${errorMessage}`);
				}
			}
		}

		// Cleanup
		if (tempDir) {
			await fs.remove(tempDir);
		}

		if (errors.length > 0) {
			s.stop(
				pc.yellow(
					`Completed with errors. Installed: ${installedCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`,
				),
			);
			console.error(pc.red("\nErrors encountered:"));
			for (const e of errors) {
				console.error(pc.red(`- ${e}`));
			}
		} else {
			s.stop(
				pc.green(
					`Successfully installed ${installedCount} ${normalizedType}s. (${skippedCount} skipped)`,
				),
			);
		}

		outro("You're all set!");
	} catch (error) {
		if (tempDir) await fs.remove(tempDir);
		cancel(`An error occurred: ${error}`);
		process.exit(1);
	}
}
