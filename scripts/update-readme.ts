import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import {
	PLATFORM_LABELS,
	PLATFORM_PATHS_AGENTS,
	PLATFORM_PATHS_SKILLS,
	PLATFORM_PATHS_WORKFLOWS,
	type Platform,
} from "../src/utils/paths.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const README_PATH = path.join(PROJECT_ROOT, "README.md");

function generateSupportedAgentsTable() {
	let table = `| Platform | Agents Path | Skills Path | Workflows Path |\n`;
	table += `| :--- | :--- | :--- | :--- |\n`;

	const platforms = Object.keys(PLATFORM_LABELS) as Platform[];

	for (const platform of platforms) {
		const label = PLATFORM_LABELS[platform];
		const skillPath = PLATFORM_PATHS_SKILLS[platform]?.replace(
			os.homedir(),
			"~",
		);
		const agentPath = PLATFORM_PATHS_AGENTS[platform]?.replace(
			os.homedir(),
			"~",
		);
		const workflowPath = PLATFORM_PATHS_WORKFLOWS[platform]?.replace(
			os.homedir(),
			"~",
		);

		table += `| ${label} | \`${agentPath || "-"}\` | \`${skillPath || "-"}\` | \`${workflowPath || "-"}\` |\n`;
	}

	return table;
}

async function main() {
	if (!(await fs.pathExists(README_PATH))) {
		console.error("README.md not found!");
		process.exit(1);
	}

	let content = await fs.readFile(README_PATH, "utf-8");
	const table = generateSupportedAgentsTable();

	const startMarker = "<!-- SUPPORTED_AGENTS_START -->";
	const endMarker = "<!-- SUPPORTED_AGENTS_END -->";

	const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, "m");

	if (!regex.test(content)) {
		console.error(
			`Markers not found in README.md. Please ensure '${startMarker}' and '${endMarker}' exist.`,
		);
		process.exit(1);
	}

	const newContent = `${startMarker}\n${table}${endMarker}`;
	content = content.replace(regex, newContent);

	await fs.writeFile(README_PATH, content);
	console.log("README.md updated successfully!");
}

main().catch(console.error);
