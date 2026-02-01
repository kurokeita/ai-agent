import fs from "fs-extra";
import pc from "picocolors";
import { getTargetPaths, TYPE_DIRS } from "../utils/paths.js";

export async function list(type?: string, options?: { local: boolean }) {
	try {
		const typesToList = type
			? [type.toLowerCase()]
			: ["skill", "agent", "workflow"];

		for (const t of typesToList) {
			// Handle plural/singular input for convenience
			const normalizedType = t.endsWith("s") ? t.slice(0, -1) : t;

			if (options?.local) {
				// List installed items locally
				console.log(pc.bold(pc.blue(`Installed ${normalizedType}s (Local):`)));
				const targetPaths = getTargetPaths(normalizedType);
				let foundAny = false;

				for (const [platform, pathStr] of Object.entries(targetPaths)) {
					const fullPath = pathStr as string;
					if (await fs.pathExists(fullPath)) {
						const entries = await fs.readdir(fullPath, {
							withFileTypes: true,
						});
						const items = entries
							.filter(
								(entry) =>
									entry.isDirectory() ||
									// For local items, agents/workflows might be directories OR .md files depending on how they were installed/flattened.
									// Usually flattened -> directory (if unpacked) or file (if generic).
									// Existing add logic:
									// Agents/Workflows can be flattened (unpacked to base) or not.
									// If flattened, they are files in the base dir? No, unpacked to base means they are files/dirs IN the base dir.
									// Wait, if I import "agent-a" (dir) and flatten, it copies contents of agent-a to agents/.
									// So "agents/skill.md" might exist.
									// The user requirement says "list all installed agents/skills/workflows".
									// In local global_skills (antigravity), they are directories.
									// In local global_agents, they might be directories or .md files.
									// Let's list directories and .md files.
									(entry.isFile() && entry.name.endsWith(".md")),
							)
							.map((entry) => entry.name)
							.sort();

						if (items.length > 0) {
							foundAny = true;
							console.log(pc.cyan(`  ${platform}:`));
							for (const item of items) {
								console.log(`    - ${item}`);
							}
						}
					}
				}

				if (!foundAny) {
					console.log(pc.dim(`  No installed ${normalizedType}s found.`));
				}
				console.log(""); // Newline for separation
			} else {
				// List available items in repo (existing logic)
				if (!TYPE_DIRS[normalizedType]) {
					if (type) {
						console.error(
							pc.red(
								`Unknown type: ${type}. Supported types: skill, agent, workflow`,
							),
						);
					}
					continue;
				}

				const dirPath = TYPE_DIRS[normalizedType];

				if (!(await fs.pathExists(dirPath))) {
					if (type) {
						console.log(pc.yellow(`No ${t} directory found at: ${dirPath}`));
					}
					continue;
				}

				const entries = await fs.readdir(dirPath, { withFileTypes: true });
				const items = entries
					.filter(
						(entry) =>
							entry.isDirectory() ||
							(normalizedType !== "skill" &&
								entry.isFile() &&
								entry.name.endsWith(".md")),
					)
					.map((entry) => entry.name)
					.sort();

				if (items.length > 0) {
					console.log(pc.bold(pc.blue(`Available ${normalizedType}s:`)));
					for (const item of items) {
						console.log(`- ${item}`);
					}
					console.log(pc.dim(`Total: ${items.length} ${normalizedType}s\n`));
				} else if (type) {
					console.log(pc.dim(`No ${normalizedType}s found.`));
				}
			}
		}
	} catch (error) {
		console.error(pc.red("Error listing items:"), error);
	}
}
