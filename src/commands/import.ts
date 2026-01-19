import path from "node:path";
import { fileURLToPath } from "node:url";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SKILLS_DIR = path.join(PROJECT_ROOT, "skills");

export async function importSkill(url: string) {
	console.clear();
	intro(pc.bgCyan(pc.black(" AI Skills Manager : Import ")));

	if (!url) {
		cancel("GitHub URL is required.");
		process.exit(1);
	}

	let tempDir: string | null = null;

	try {
		// 1. Fetch Skill
		const s = spinner();
		s.start("Fetching skill from GitHub...");
		let skillName = "";

		try {
			const result = await fetchSkillFromGitHub(url);
			tempDir = result.tempDir;
			skillName = result.skillName;
			s.stop(pc.green(`Fetched skill: ${skillName}`));
		} catch (e) {
			s.stop(pc.red("Failed to fetch skill"));
			throw e;
		}

		// 2. Determine Target
		const targetPath = path.join(SKILLS_DIR, skillName);

		// 3. Check Existence & Confirm Overwrite
		if (await fs.pathExists(targetPath)) {
			const shouldOverwrite = await confirm({
				message: `Skill '${skillName}' already exists in the repo. Overwrite?`,
				initialValue: false,
			});

			if (isCancel(shouldOverwrite) || !shouldOverwrite) {
				if (tempDir) await fs.remove(tempDir);
				cancel("Operation cancelled.");
				process.exit(0);
			}
		}

		// 4. Move/Copy to Skills Directory
		s.start(`Importing ${skillName} to ${SKILLS_DIR}...`);
		await fs.ensureDir(SKILLS_DIR);
		await fs.copy(tempDir, targetPath, { overwrite: true });
		s.stop(pc.green(`Successfully imported ${skillName}!`));

		// Cleanup
		if (tempDir) {
			await fs.remove(tempDir);
		}

		outro(`Skill available at: ${targetPath}`);
	} catch (error) {
		if (tempDir) await fs.remove(tempDir);
		cancel(`An error occurred: ${error}`);
		process.exit(1);
	}
}
