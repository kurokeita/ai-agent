import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { PLATFORM_OPTIONS } from "../src/commands/add.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const README_PATH = path.join(PROJECT_ROOT, "README.md");

function generateSupportedAgentsTable() {
	let table = `| Agent | Global Path |\n`;
	table += `| :--- | :--- |\n`;

	for (const option of PLATFORM_OPTIONS) {
		table += `| ${option.label} | \`${option.hint}\` |\n`;
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
