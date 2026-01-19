import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SKILLS_DIR = path.join(PROJECT_ROOT, "skills");

type Platform = "copilot" | "windsurf" | "antigravity" | "gemini";

const PLATFORM_PATHS: Record<Platform, string> = {
	copilot: path.join(os.homedir(), ".copilot/skills"),
	windsurf: path.join(os.homedir(), ".codeium/windsurf/skills"),
	antigravity: path.join(os.homedir(), ".gemini/antigravity/global_skills"),
	gemini: path.join(os.homedir(), ".gemini/skills"),
};

const PLATFORM_OPTIONS = [
	{
		label: "Antigravity",
		value: "antigravity",
		hint: "~/.gemini/antigravity/global_skills",
	},
	{ label: "Gemini CLI", value: "gemini", hint: "~/.gemini/skills" },
	{ label: "GitHub Copilot", value: "copilot", hint: "~/.copilot/skills" },
	{
		label: "Windsurf",
		value: "windsurf",
		hint: "~/.codeium/windsurf/skills",
	},
];

async function installSkill(
	skillName: string,
	platform: Platform,
	overwrite: boolean,
): Promise<boolean> {
	const sourcePath = path.join(SKILLS_DIR, skillName);
	const targetBaseDir = PLATFORM_PATHS[platform];
	const targetPath = path.join(targetBaseDir, skillName);

	if (!(await fs.pathExists(sourcePath))) {
		throw new Error(`Skill '${skillName}' not found`);
	}

	if (!overwrite && (await fs.pathExists(targetPath))) {
		return false;
	}

	await fs.ensureDir(targetBaseDir);
	await fs.copy(sourcePath, targetPath, { overwrite });
	return true;
}

export async function addSkill() {
	console.clear();
	intro(pc.bgCyan(pc.black(" AI Skills Manager ")));

	try {
		// 1. Check Skills Directory
		if (!(await fs.pathExists(SKILLS_DIR))) {
			cancel(pc.red("Skills directory not found!"));
			process.exit(1);
		}

		const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
		const availableSkills = entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => ({ label: entry.name, value: entry.name }))
			.sort((a, b) => a.label.localeCompare(b.label));

		if (availableSkills.length === 0) {
			cancel("No skills found in the skills directory.");
			process.exit(0);
		}

		// 2. Select Platforms
		const platforms = await multiselect({
			message: "Select target platforms:",
			options: PLATFORM_OPTIONS,
			required: true,
		});

		if (isCancel(platforms)) {
			cancel("Operation cancelled.");
			process.exit(0);
		}

		// 3. Select Skills
		const skills = await multiselect({
			message: "Select skills to install:",
			options: availableSkills,
			required: true,
		});

		if (isCancel(skills)) {
			cancel("Operation cancelled.");
			process.exit(0);
		}

		const selectedPlatforms = platforms as Platform[];
		const selectedSkills = skills as string[];

		// 4. Check for existing skills
		const existingSkills: { skill: string; platform: Platform }[] = [];
		for (const platform of selectedPlatforms) {
			for (const skill of selectedSkills) {
				const targetPath = path.join(PLATFORM_PATHS[platform], skill);
				if (await fs.pathExists(targetPath)) {
					existingSkills.push({ skill, platform });
				}
			}
		}

		let overwrite = true;
		if (existingSkills.length > 0) {
			const limit = 5;
			const displayList = existingSkills
				.slice(0, limit)
				.map((e) => `${pc.bold(e.skill)} (${e.platform})`)
				.join(", ");
			const remainder = existingSkills.length - limit;
			const message =
				remainder > 0
					? `The following skills already exist: ${displayList}, and ${remainder} others.`
					: `The following skills already exist: ${displayList}.`;

			note(message, "Attention");

			const shouldOverwrite = await confirm({
				message: "Do you want to overwrite existing skills?",
				initialValue: false,
			});

			if (isCancel(shouldOverwrite)) {
				cancel("Operation cancelled.");
				process.exit(0);
			}

			overwrite = shouldOverwrite as boolean;
		}

		// 5. Confirmation Note
		note(
			`Installing ${selectedSkills.length} skills to ${selectedPlatforms.length} platforms...`,
			"Summary",
		);

		// 6. Installation Loop with Spinner
		const s = spinner();
		s.start("Installing skills...");

		const errors: string[] = [];
		let installedCount = 0;
		let skippedCount = 0;

		for (const platform of selectedPlatforms) {
			for (const skill of selectedSkills) {
				const message = `Installing ${pc.bold(skill)} to ${pc.cyan(platform)}...`;
				s.message(message);
				try {
					const installed = await installSkill(skill, platform, overwrite);
					if (installed) {
						installedCount++;
					} else {
						skippedCount++;
					}
				} catch (err: unknown) {
					const errorMessage = err instanceof Error ? err.message : String(err);
					errors.push(`${skill} -> ${platform}: ${errorMessage}`);
				}
			}
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
					`Successfully installed ${installedCount} skills. (${skippedCount} skipped)`,
				),
			);
		}

		outro("You're all set!");
	} catch (error) {
		cancel(`An error occurred: ${error}`);
		process.exit(1);
	}
}
