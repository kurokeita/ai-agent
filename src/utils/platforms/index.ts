import { AntigravityHandler } from "./antigravity"
import { CopilotHandler } from "./copilot"
import { DefaultHandler } from "./default"
import { GeminiHandler } from "./gemini"
import type { PlatformHandler } from "./types"
import { WindsurfHandler } from "./windsurf"

const handlers: Map<string, PlatformHandler> = new Map()

export function registerHandler(handler: PlatformHandler) {
	handlers.set(handler.platform, handler)
}

// Register default handlers
registerHandler(new AntigravityHandler())
registerHandler(new CopilotHandler())
registerHandler(new GeminiHandler())
registerHandler(new WindsurfHandler())

export function getHandler(platform: string): PlatformHandler {
	return handlers.get(platform) || new DefaultHandler(platform)
}

export type { PlatformHandler }
