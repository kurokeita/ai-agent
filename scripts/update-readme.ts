import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fs from "fs-extra"
import {
	getProjectPlatformPathsAgents,
	getProjectPlatformPathsSkills,
	getProjectPlatformPathsWorkflows,
	PLATFORM_LABELS,
	PLATFORM_PATHS_AGENTS,
	PLATFORM_PATHS_SKILLS,
	PLATFORM_PATHS_WORKFLOWS,
	type Platform,
} from "@/utils/paths"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, "..")
const README_PATH = path.join(PROJECT_ROOT, "README.md")

const PROJECT_ROOT_TOKEN = "<project-root>"

function generateSupportedAgentsTable() {
	let table = `| Platform | Agents Path | Skills Path | Workflows Path |\n`
	table += `| :--- | :--- | :--- | :--- |\n`

	const platforms = Object.keys(PLATFORM_LABELS) as Platform[]

	for (const platform of platforms) {
		const label = PLATFORM_LABELS[platform]
		const skillPath = PLATFORM_PATHS_SKILLS[platform]?.replace(
			os.homedir(),
			"~",
		)
		const agentPath = PLATFORM_PATHS_AGENTS[platform]?.replace(
			os.homedir(),
			"~",
		)
		const workflowPath = PLATFORM_PATHS_WORKFLOWS[platform]?.replace(
			os.homedir(),
			"~",
		)

		const agentPathDisplay = agentPath ? `\`${agentPath}\`` : "*Not Supported*"

		table += `| ${label} | ${agentPathDisplay} | \`${skillPath || "-"}\` | \`${workflowPath || "-"}\` |\n`
	}

	return table
}

function generateProjectScopeTable() {
	const skillPaths = getProjectPlatformPathsSkills(PROJECT_ROOT_TOKEN)
	const agentPaths = getProjectPlatformPathsAgents(PROJECT_ROOT_TOKEN)
	const workflowPaths = getProjectPlatformPathsWorkflows(PROJECT_ROOT_TOKEN)

	let table = `| Platform | Agents Path | Skills Path | Workflows Path |\n`
	table += `| :--- | :--- | :--- | :--- |\n`

	const platforms = Object.keys(PLATFORM_LABELS) as Platform[]

	for (const platform of platforms) {
		const label = PLATFORM_LABELS[platform]
		const agentPath = agentPaths[platform]
		const skillPath = skillPaths[platform]
		const workflowPath = workflowPaths[platform]

		const agentDisplay = agentPath ? `\`${agentPath}\`` : "*Not Supported*"

		table += `| ${label} | ${agentDisplay} | \`${skillPath || "-"}\` | \`${workflowPath || "-"}\` |\n`
	}

	return table
}

function replaceBlock(
	content: string,
	startMarker: string,
	endMarker: string,
	body: string,
): string {
	const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, "m")
	if (!regex.test(content)) {
		console.error(
			`Markers not found in README.md. Please ensure '${startMarker}' and '${endMarker}' exist.`,
		)
		process.exit(1)
	}
	return content.replace(regex, `${startMarker}\n${body}${endMarker}`)
}

async function main() {
	if (!(await fs.pathExists(README_PATH))) {
		console.error("README.md not found!")
		process.exit(1)
	}

	let content = await fs.readFile(README_PATH, "utf-8")

	content = replaceBlock(
		content,
		"<!-- SUPPORTED_AGENTS_START -->",
		"<!-- SUPPORTED_AGENTS_END -->",
		generateSupportedAgentsTable(),
	)

	content = replaceBlock(
		content,
		"<!-- PROJECT_SCOPE_PATHS_START -->",
		"<!-- PROJECT_SCOPE_PATHS_END -->",
		generateProjectScopeTable(),
	)

	await fs.writeFile(README_PATH, content)
	console.log("README.md updated successfully!")
}

main().catch(console.error)
