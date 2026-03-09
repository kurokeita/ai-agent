import type { PlatformHandler } from "./types"

const handlers: Map<string, PlatformHandler> = new Map()

export function registerHandler(handler: PlatformHandler) {
	handlers.set(handler.platform, handler)
}

export function getHandler(platform: string): PlatformHandler | undefined {
	return handlers.get(platform)
}

export type { PlatformHandler }
