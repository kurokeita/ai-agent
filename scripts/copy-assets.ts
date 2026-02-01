import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import pc from "picocolors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(PROJECT_ROOT, "skills");
const AGENTS_DIR = path.join(PROJECT_ROOT, "agents");
const WORKFLOWS_DIR = path.join(PROJECT_ROOT, "workflows");
const DIST_DIR = path.join(PROJECT_ROOT, "dist");
const DIST_SKILLS_DIR = path.join(DIST_DIR, "skills");
const DIST_AGENTS_DIR = path.join(DIST_DIR, "agents");
const DIST_WORKFLOWS_DIR = path.join(DIST_DIR, "workflows");

async function copyAssets() {
	try {
		console.log(pc.blue("Copying assets..."));

		if (!(await fs.pathExists(SKILLS_DIR))) {
			console.error(pc.red("Skills directory not found!"));
			process.exit(1);
		}

		await fs.ensureDir(DIST_DIR);

		await fs.copy(AGENTS_DIR, DIST_AGENTS_DIR, { overwrite: true });
		console.log(pc.green("✓ Assets copied to dist/agents"));

		await fs.copy(SKILLS_DIR, DIST_SKILLS_DIR, { overwrite: true });
		console.log(pc.green("✓ Assets copied to dist/skills"));

		await fs.copy(WORKFLOWS_DIR, DIST_WORKFLOWS_DIR, { overwrite: true });
		console.log(pc.green("✓ Assets copied to dist/workflows"));
	} catch (error) {
		console.error(pc.red("Error copying assets:"), error);
		process.exit(1);
	}
}

copyAssets();
