import { describe, expect, it } from "vitest"
import { CodexHandler } from "../codex"

describe("CodexHandler", () => {
	const handler = new CodexHandler()

	it("should leave skills unchanged", () => {
		const content =
			"---\nname: test-skill\ndescription: Existing description\n---\n\nBody"
		expect(handler.transform(content, "skill", "test-skill")).toBe(content)
	})

	it("should convert agents into Codex skills", () => {
		const content =
			"---\nname: test-agent\ndescription: Existing description\n---\n\n# Agent\nBody"
		const transformed = handler.transform(content, "agent", "test-agent")

		expect(transformed).toContain("name: test-agent")
		expect(transformed).toContain("description: Existing description")
		expect(transformed).toContain("# Agent")
		expect(transformed).not.toContain("tools:")
	})

	it("should convert workflows into Codex skills", () => {
		const content = "# Workflow Title\nDo the thing"
		const transformed = handler.transform(content, "workflow", "test-workflow")

		expect(transformed).toContain("name: test-workflow")
		expect(transformed).toContain(
			"description: This skill should be used when Codex needs to follow the Workflow Title workflow instructions.",
		)
		expect(transformed).toContain("# Workflow Title")
	})

	it("should handle invalid frontmatter for converted items", () => {
		const content = "---\ninvalid: yaml: : :\n---\n# Agent"
		const transformed = handler.transform(content, "agent", "fallback-agent")

		expect(transformed).toContain("name: fallback-agent")
		expect(transformed).toContain(
			"description: This skill should be used when Codex needs to follow the Agent agent instructions.",
		)
	})
})
