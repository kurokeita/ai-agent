import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	cancel,
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
	{ label: "GitHub Copilot", value: "copilot", hint: "~/.copilot/skills" },
	{
		label: "Windsurf",
		value: "windsurf",
		hint: "~/.codeium/windsurf/skills",
	},
	{
		label: "Antigravity",
		value: "antigravity",
		hint: "~/.gemini/antigravity/global_skills",
	},
	{ label: "Gemini CLI", value: "gemini", hint: "~/.gemini/skills" },
];

async function installSkill(
	skillName: string,
	platform: Platform,
): Promise<void> {
	const sourcePath = path.join(SKILLS_DIR, skillName);
	const targetBaseDir = PLATFORM_PATHS[platform];
	const targetPath = path.join(targetBaseDir, skillName);

	if (!(await fs.pathExists(sourcePath))) {
		throw new Error(`Skill '${skillName}' not found`);
	}

	await fs.ensureDir(targetBaseDir);
	await fs.copy(sourcePath, targetPath, { overwrite: true });
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

		// 4. Confirmation Note
		note(
			`Installing ${selectedSkills.length} skills to ${selectedPlatforms.length} platforms...`,
			"Summary",
		);

		// 5. Installation Loop with Spinner
		const s = spinner();
		s.start("Installing skills...");

		const errors: string[] = [];

		for (const platform of selectedPlatforms) {
			for (const skill of selectedSkills) {
				const message = `Installing ${pc.bold(skill)} to ${pc.cyan(platform)}...`;
				s.message(message);
				try {
					await installSkill(skill, platform);
				} catch (err: unknown) {
					const errorMessage = err instanceof Error ? err.message : String(err);
					errors.push(`${skill} -> ${platform}: ${errorMessage}`);
				}
			}
		}

		if (errors.length > 0) {
			s.stop(pc.yellow("Completed with errors."));
			console.error(pc.red("\nErrors encountered:"));
			for (const e of errors) {
				console.error(pc.red(`- ${e}`));
			}
		} else {
			s.stop(pc.green("All installations completed successfully!"));
		}

		outro("You're all set!");
	} catch (error) {
		cancel(`An error occurred: ${error}`);
		process.exit(1);
	}
}
