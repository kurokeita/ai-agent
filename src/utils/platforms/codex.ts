import path from "node:path"
import yaml from "js-yaml"
import type { PlatformHandler } from "./types"

const frontmatterRegex = /^---\n([\s\S]*?)\n---/

function extractTitle(body: string): string | undefined {
	const match = body.match(/^#\s+(.+)$/m)
	return match?.[1]?.trim()
}

function buildDescription(
	type: string,
	itemName: string,
	title?: string,
): string {
	const subject = title || itemName

	if (type === "agent") {
		return `This skill should be used when Codex needs to follow the ${subject} agent instructions.`
	}

	if (type === "workflow") {
		return `This skill should be used when Codex needs to follow the ${subject} workflow instructions.`
	}

	return `This skill should be used when Codex needs the ${subject} skill.`
}

function toYamlFrontmatter(name: string, description: string): string {
	const normalizedName = name.replace(/\n+/g, " ").trim()
	const normalizedDescription = description.replace(/\n+/g, " ").trim()

	return `name: ${normalizedName}\ndescription: ${normalizedDescription}`
}

export class CodexHandler implements PlatformHandler {
	platform = "codex"

	getTargetFileName(itemName: string, type: string): string {
		if (type === "agent" || type === "workflow") {
			return path.join(path.parse(itemName).name, "SKILL.md")
		}

		return itemName
	}

	transform(content: string, type: string, itemName: string): string {
		if (type === "skill") return content
		if (type !== "agent" && type !== "workflow") return content

		let name = itemName
		let description = ""
		let body = content.trim()
		const match = content.match(frontmatterRegex)

		if (match) {
			body = content.replace(frontmatterRegex, "").trim()
			try {
				const parsed = yaml.load(match[1])
				if (parsed && typeof parsed === "object") {
					const frontmatter = parsed as Record<string, unknown>
					if (typeof frontmatter.name === "string" && frontmatter.name.trim()) {
						name = frontmatter.name.trim()
					}
					if (
						typeof frontmatter.description === "string" &&
						frontmatter.description.trim()
					) {
						description = frontmatter.description.trim()
					}
				}
			} catch {
				name = itemName
				description = ""
			}
		}

		if (!description) {
			description = buildDescription(type, itemName, extractTitle(body))
		}

		const yamlStr = toYamlFrontmatter(name, description)
		return `---\n${yamlStr}\n---\n\n${body}`
	}
}
