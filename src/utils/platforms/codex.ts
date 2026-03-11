import path from "node:path"
import fs from "fs-extra"
import yaml from "js-yaml"
import type { PlatformHandler } from "./types"

const frontmatterRegex = /^---\n([\s\S]*?)\n---/
export const CODEX_TYPE_FIELD = "x-ai-agents-type"

type CodexItemType = "skill" | "agent" | "workflow"

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

function toYamlFrontmatter(
	name: string,
	description: string,
	extraFields: Record<string, string> = {},
): string {
	const normalizedName = name.replace(/\n+/g, " ").trim()
	const normalizedDescription = description.replace(/\n+/g, " ").trim()

	return yaml
		.dump(
			{
				name: normalizedName,
				description: normalizedDescription,
				...extraFields,
			},
			{ lineWidth: -1 },
		)
		.trimEnd()
}

function parseCodexType(content: string): CodexItemType {
	const match = content.match(frontmatterRegex)
	if (!match) return "skill"

	try {
		const parsed = yaml.load(match[1])
		if (parsed && typeof parsed === "object") {
			const type = (parsed as Record<string, unknown>)[CODEX_TYPE_FIELD]
			if (type === "agent" || type === "workflow" || type === "skill") {
				return type
			}
		}
	} catch {
		return "skill"
	}

	return "skill"
}

export async function codexEntryMatchesType(
	basePath: string,
	entry: { name: string; isDirectory(): boolean; isFile(): boolean },
	requestedType: string,
): Promise<boolean> {
	let targetPath: string | null = null

	if (entry.isDirectory()) {
		targetPath = path.join(basePath, entry.name, "SKILL.md")
	} else if (entry.isFile() && entry.name.endsWith(".md")) {
		targetPath = path.join(basePath, entry.name)
	}

	if (!targetPath) return false

	try {
		const content = await fs.readFile(targetPath, "utf-8")
		return parseCodexType(content) === requestedType
	} catch {
		return false
	}
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

		const yamlStr = toYamlFrontmatter(name, description, {
			[CODEX_TYPE_FIELD]: type,
		})

		return `---\n${yamlStr}\n---\n\n${body}`
	}
}
