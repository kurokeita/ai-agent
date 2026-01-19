import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import pc from "picocolors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(PROJECT_ROOT, "skills");
const DIST_DIR = path.join(PROJECT_ROOT, "dist");
const DIST_SKILLS_DIR = path.join(DIST_DIR, "skills");

async function copyAssets() {
	try {
		console.log(pc.blue("Copying assets..."));

		if (!(await fs.pathExists(SKILLS_DIR))) {
			console.error(pc.red("Skills directory not found!"));
			process.exit(1);
		}

		await fs.ensureDir(DIST_DIR);
		await fs.copy(SKILLS_DIR, DIST_SKILLS_DIR, { overwrite: true });

		console.log(pc.green("✓ Assets copied to dist/skills"));
	} catch (error) {
		console.error(pc.red("Error copying assets:"), error);
		process.exit(1);
	}
}

copyAssets();
