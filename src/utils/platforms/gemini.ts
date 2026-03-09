import { convertToGeminiCommandTOML } from "../toml"
import type { PlatformHandler } from "./types"

export class GeminiHandler implements PlatformHandler {
	platform = "gemini"

	getTargetFileName(itemName: string, type: string): string {
		if (type === "agent" || type === "workflow") {
			return itemName.replace(/\.md$/, "") + ".toml"
		}
		return itemName
	}

	transform(content: string, type: string, itemName: string): string {
		if (type === "agent" || type === "workflow") {
			return convertToGeminiCommandTOML(content)
		}
		return content
	}
}
