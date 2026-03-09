import { describe, expect, it } from "vitest"
import { getHandler } from "../index"

describe("Platform Registry", () => {
	it("should return CopilotHandler for copilot platform", () => {
		const handler = getHandler("copilot")
		expect(handler.platform).toBe("copilot")
	})

	it("should return GeminiHandler for gemini platform", () => {
		const handler = getHandler("gemini")
		expect(handler.platform).toBe("gemini")
	})

	it("should return DefaultHandler for unknown platform", () => {
		const handler = getHandler("unknown")
		expect(handler.platform).toBe("unknown")
	})
})
