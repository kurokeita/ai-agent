import { describe, expect, it } from "vitest"
import { GeminiHandler } from "../gemini"

describe("GeminiHandler", () => {
	const handler = new GeminiHandler()

	it("should return .md for agent type", () => {
		expect(handler.getTargetFileName("test-agent.md", "agent")).toBe(
			"test-agent.md",
		)
	})

	it("should return .toml for workflow type", () => {
		expect(handler.getTargetFileName("test-workflow.md", "workflow")).toBe(
			"test-workflow.toml",
		)
	})

	it("should transform workflow content to TOML", () => {
		const content = "# Test Workflow\nBody"
		const transformed = handler.transform(content, "workflow", "test-workflow")
		expect(transformed).toContain('description = "Test Workflow"')
		expect(transformed).toContain('prompt = """')
	})

	it("should transform agent content with tools", () => {
		const content = "---\nname: test\ndescription: test\n---\n# Body"
		const transformed = handler.transform(content, "agent", "test-agent")
		expect(transformed).toContain("tools:")
		expect(transformed).toContain("- list_directory")
		expect(transformed).toContain("- read_file")
		expect(transformed).toContain("- run_shell_command")
		expect(transformed).not.toContain('description = "test"') // Not TOML
	})

	it("should transform agent content with tools and remove skills", () => {
		const content =
			"---\nname: test\ndescription: test\nskills: [skill1]\n---\n# Body"
		const transformed = handler.transform(content, "agent", "test-agent")
		expect(transformed).toContain("tools:")
		expect(transformed).toContain("- list_directory")
		expect(transformed).not.toContain("skills:")
		expect(transformed).not.toContain("skill1")
	})

	it("should handle agents without frontmatter", () => {
		const content = "# Simple Body"
		const transformed = handler.transform(content, "agent", "simple-agent")
		expect(transformed).toContain("name: simple-agent")
		expect(transformed).toContain("tools:")
		expect(transformed).toContain("# Simple Body")
	})

	it("should handle agents with invalid yaml frontmatter", () => {
		const content = "---\ninvalid: yaml: : :\n---\n# Body"
		const transformed = handler.transform(content, "agent", "bad-yaml")
		expect(transformed).toContain("name: bad-yaml")
		expect(transformed).toContain("tools:")
	})

	it("should NOT transform other content types", () => {
		const content = "# Test Other\nBody"
		const transformed = handler.transform(content, "skill", "test-skill")
		expect(transformed).toBe(content)
	})
})
