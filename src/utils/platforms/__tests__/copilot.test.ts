import { describe, expect, it } from "vitest"
import { CopilotHandler } from "../copilot"

describe("CopilotHandler", () => {
	const handler = new CopilotHandler()

	it("should return .md for agent type", () => {
		expect(handler.getTargetFileName("test-agent", "agent")).toBe(
			"test-agent.md",
		)
	})

	it("should return original name for other types", () => {
		expect(handler.getTargetFileName("test-skill", "skill")).toBe("test-skill")
	})

	it("should transform agent content with target and tools", () => {
		const content = "---\nname: test\ndescription: test\n---\n# Body"
		const transformed = handler.transform(content, "agent", "test-agent")
		expect(transformed).toContain("target: github-copilot")
		expect(transformed).toContain("tools:")
		expect(transformed).toContain("- edit")
		expect(transformed).toContain("- terminal")
		expect(transformed).toContain("- ls")
		expect(transformed).toContain("- grep_search")
		expect(transformed).toContain("- githubRepo")
	})

	it("should maintain existing frontmatter fields", () => {
		const content =
			"---\nname: test\ndescription: test\nskills: [js]\n---\n# Body"
		const transformed = handler.transform(content, "agent", "test-agent")
		expect(transformed).toContain("skills:")
		expect(transformed).toContain("- js")
	})

	it("should return original content for non-agent types", () => {
		const content = "# Body"
		expect(handler.transform(content, "skill", "test")).toBe(content)
	})

	it("should handle agents without frontmatter", () => {
		const content = "# Simple Body"
		const transformed = handler.transform(content, "agent", "simple-agent")
		expect(transformed).toContain("name: simple-agent")
		expect(transformed).toContain("target: github-copilot")
		expect(transformed).toContain("# Simple Body")
	})

	it("should handle invalid yaml frontmatter", () => {
		const content = "---\ninvalid: yaml: : :\n---\n# Body"
		const transformed = handler.transform(content, "agent", "bad-yaml")
		expect(transformed).toContain("name: bad-yaml")
		expect(transformed).toContain("target: github-copilot")
	})
})
