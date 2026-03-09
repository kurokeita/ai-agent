import yaml from "js-yaml"
import { convertToGeminiCommandTOML } from "../toml"
import type { PlatformHandler } from "./types"

export class GeminiHandler implements PlatformHandler {
	platform = "gemini"

	getTargetFileName(itemName: string, type: string): string {
		if (type === "workflow") {
			return `${itemName.replace(/\.md$/, "")}.toml`
		}
		return itemName
	}

	transform(content: string, type: string, itemName: string): string {
		if (type === "workflow") {
			return convertToGeminiCommandTOML(content)
		}

		if (type === "agent") {
			const frontmatterRegex = /^---\n([\s\S]*?)\n---/
			const match = content.match(frontmatterRegex)

			let frontmatter: Record<string, unknown> = {
				name: itemName,
				description: "",
				tools: [
					"list_directory",
					"read_file",
					"write_file",
					"glob",
					"grep_search",
					"replace",
					"run_shell_command",
					"google_web_search",
					"web_fetch",
					"ask_user",
					"save_memory",
					"activate_skill",
				],
			}
			let body = content

			if (match) {
				try {
					const parsed = yaml.load(match[1]) as Record<string, unknown>
					frontmatter = { ...frontmatter, ...parsed }
					// Ensure tools are set for Gemini
					frontmatter.tools = [
						"list_directory",
						"read_file",
						"write_file",
						"glob",
						"grep_search",
						"replace",
						"run_shell_command",
						"google_web_search",
						"web_fetch",
						"ask_user",
						"save_memory",
						"activate_skill",
					]
					// Gemini does not use the skills property in subagents
					delete frontmatter.skills
					body = content.replace(frontmatterRegex, "").trim()
				} catch (_) {
					// If parsing fails, we'll just use the default frontmatter
				}
			}

			const yamlStr = yaml.dump(frontmatter)
			return `---\n${yamlStr}---\n\n${body}`
		}

		return content
	}
}
