import { describe, expect, it } from "vitest"
import { GeminiHandler } from "../gemini"

describe("GeminiHandler", () => {
	const handler = new GeminiHandler()

	it("should return .toml for agent type", () => {
		expect(handler.getTargetFileName("test-agent.md", "agent")).toBe(
			"test-agent.toml",
		)
	})

	it("should return .toml for workflow type", () => {
		expect(handler.getTargetFileName("test-workflow.md", "workflow")).toBe(
			"test-workflow.toml",
		)
	})

	it("should transform agent content to TOML", () => {
		const content = "# Test Agent\nBody"
		const transformed = handler.transform(content, "agent", "test-agent")
		expect(transformed).toContain('description = "Test Agent"')
		expect(transformed).toContain('prompt = """')
	})
})
