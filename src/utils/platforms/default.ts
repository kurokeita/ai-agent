import type { PlatformHandler } from "./types"

export class DefaultHandler implements PlatformHandler {
	constructor(public platform: string = "default") {}

	getTargetFileName(itemName: string, type: string): string {
		return itemName
	}

	transform(content: string, type: string, itemName: string): string {
		return content
	}
}
