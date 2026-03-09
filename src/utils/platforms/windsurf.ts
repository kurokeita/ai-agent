import path from "node:path"
import type { PlatformHandler } from "./types"

export class WindsurfHandler implements PlatformHandler {
	platform = "windsurf"

	getTargetFileName(itemName: string, type: string): string {
		if (type === "agent") {
			return path.join(path.parse(itemName).name, "AGENTS.md")
		}
		return itemName
	}

	transform(content: string, _type: string, _itemName: string): string {
		return content
	}
}
