import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import pc from "picocolors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assuming skills are in the root 'skills' directory relative to the project root
// bin/skills.ts -> ../ -> src/commands -> ../../ -> root -> skills
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SKILLS_DIR = path.join(PROJECT_ROOT, "skills");

export async function listSkills() {
	try {
		if (!(await fs.pathExists(SKILLS_DIR))) {
			console.log(
				pc.yellow("No existing skills directory found at:"),
				SKILLS_DIR,
			);
			return;
		}

		const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
		const skills = entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();

		console.log(pc.bold(pc.blue("Available Skills:")));
		for (const skill of skills) {
			console.log(`- ${skill}`);
		}
		console.log(pc.dim(`\nTotal: ${skills.length} skills`));
	} catch (error) {
		console.error(pc.red("Error listing skills:"), error);
	}
}
