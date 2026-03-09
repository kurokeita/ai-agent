import type { PlatformHandler } from "./types"

export class AntigravityHandler implements PlatformHandler {
	platform = "antigravity"

	getTargetFileName(itemName: string, _: string): string {
		return itemName
	}

	transform(content: string, _: string, __: string): string {
		return content
	}
}
