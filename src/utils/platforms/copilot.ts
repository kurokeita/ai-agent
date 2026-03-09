import yaml from "js-yaml"
import type { PlatformHandler } from "./types"

export class CopilotHandler implements PlatformHandler {
	platform = "copilot"

	getTargetFileName(itemName: string, type: string): string {
		if (type === "agent") {
			return itemName.replace(/\.md$/, "") + ".agent.md"
		}
		return itemName
	}

	transform(content: string, type: string, itemName: string): string {
		if (type !== "agent") return content

		const frontmatterRegex = /^---\n([\s\S]*?)\n---/
		const match = content.match(frontmatterRegex)

		let frontmatter: any = {
			name: itemName,
			description: "",
			target: "github-copilot",
			tools: ["edit", "terminal", "ls", "grep_search", "githubRepo"],
		}
		let body = content

		if (match) {
			try {
				const parsed = yaml.load(match[1]) as any
				frontmatter = { ...frontmatter, ...parsed }
				// Ensure target and tools are set for Copilot
				frontmatter.target = "github-copilot"
				frontmatter.tools = [
					"edit",
					"terminal",
					"ls",
					"grep_search",
					"githubRepo",
				]
				body = content.replace(frontmatterRegex, "").trim()
			} catch (e) {
				// If parsing fails, we'll just use the default frontmatter
			}
		}

		const yamlStr = yaml.dump(frontmatter)
		return `---\n${yamlStr}---\n\n${body}`
	}
}
