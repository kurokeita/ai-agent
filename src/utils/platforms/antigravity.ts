import type { PlatformHandler } from "./types"

export class AntigravityHandler implements PlatformHandler {
	platform = "antigravity"

	getTargetFileName(itemName: string, type: string): string {
		return itemName
	}

	transform(content: string, type: string, itemName: string): string {
		return content
	}
}
