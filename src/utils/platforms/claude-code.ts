import path from "node:path"
import yaml from "js-yaml"
import type { PlatformHandler } from "./types"

const frontmatterRegex = /^---\n([\s\S]*?)\n---/

const CLAUDE_CODE_TOOLS = [
	"Read",
	"Edit",
	"Write",
	"Bash",
	"Glob",
	"Grep",
	"WebFetch",
	"WebSearch",
]

export class ClaudeCodeHandler implements PlatformHandler {
	platform = "claude-code"

	getTargetFileName(itemName: string, type: string): string {
		if (type === "agent") {
			const name = itemName.replace(/\.md$/, "")
			return path.join(name, `${name}.md`)
		}

		if (type === "workflow") {
			const name = itemName.replace(/\.md$/, "")
			return path.join(name, "SKILL.md")
		}

		return itemName
	}

	transform(content: string, type: string, itemName: string): string {
		if (type === "skill") return content

		if (type === "agent") {
			return this.transformAgent(content, itemName)
		}

		if (type === "workflow") {
			return this.transformWorkflow(content, itemName)
		}

		return content
	}

	private transformAgent(content: string, itemName: string): string {
		const match = content.match(frontmatterRegex)

		let frontmatter: Record<string, unknown> = {
			name: itemName.replace(/\.md$/, ""),
			description: "",
			tools: CLAUDE_CODE_TOOLS,
		}
		let body = content

		if (match) {
			try {
				const parsed = yaml.load(match[1]) as Record<string, unknown>
				frontmatter = { ...frontmatter, ...parsed }
				frontmatter.tools = CLAUDE_CODE_TOOLS
				delete frontmatter.target
				body = content.replace(frontmatterRegex, "").trim()
			} catch (_) {
				// If parsing fails, use defaults
			}
		}

		const yamlStr = yaml.dump(frontmatter)
		return `---\n${yamlStr}---\n\n${body}`
	}

	private transformWorkflow(content: string, itemName: string): string {
		const name = itemName.replace(/\.md$/, "")
		const match = content.match(frontmatterRegex)

		let description = ""
		let body = content.trim()

		if (match) {
			try {
				const parsed = yaml.load(match[1]) as Record<string, unknown>
				if (
					typeof parsed.description === "string" &&
					parsed.description.trim()
				) {
					description = parsed.description.trim()
				}
				if (typeof parsed.name === "string" && parsed.name.trim()) {
					// Use the name from frontmatter if available
				}
			} catch (_) {
				// If parsing fails, use defaults
			}
			body = content.replace(frontmatterRegex, "").trim()
		}

		if (!description) {
			const titleMatch = body.match(/^#\s+(.+)$/m)
			const title = titleMatch?.[1]?.trim() || name
			description = `Workflow: ${title}`
		}

		const frontmatter = yaml.dump({
			name,
			description,
			"user-invocable": true,
		})

		return `---\n${frontmatter}---\n\n${body}`
	}
}
