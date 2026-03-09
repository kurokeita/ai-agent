export interface PlatformHandler {
	platform: string
	transform(content: string, type: string, itemName: string): string
	getTargetFileName(itemName: string, type: string): string
}
