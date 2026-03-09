import type { PlatformHandler } from "./types"

export class DefaultHandler implements PlatformHandler {
	constructor(public platform: string = "default") {}

	getTargetFileName(itemName: string, _type: string): string {
		return itemName
	}

	transform(content: string, _type: string, _itemName: string): string {
		return content
	}
}
