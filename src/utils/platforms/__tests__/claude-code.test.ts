import { describe, expect, it } from "vitest"
import { ClaudeCodeHandler } from "../claude-code"

describe("ClaudeCodeHandler", () => {
	const handler = new ClaudeCodeHandler()

	describe("getTargetFileName", () => {
		it("should return itemName as-is for skills", () => {
			expect(handler.getTargetFileName("test-skill", "skill")).toBe(
				"test-skill",
			)
		})

		it("should return name/name.md for agents", () => {
			expect(handler.getTargetFileName("my-agent.md", "agent")).toBe(
				"my-agent/my-agent.md",
			)
		})

		it("should strip .md before creating agent path", () => {
			expect(handler.getTargetFileName("test-agent", "agent")).toBe(
				"test-agent/test-agent.md",
			)
		})

		it("should return name/SKILL.md for workflows", () => {
			expect(handler.getTargetFileName("my-workflow.md", "workflow")).toBe(
				"my-workflow/SKILL.md",
			)
		})

		it("should strip .md before creating workflow path", () => {
			expect(handler.getTargetFileName("test-workflow", "workflow")).toBe(
				"test-workflow/SKILL.md",
			)
		})
	})

	describe("transform", () => {
		it("should return skill content as-is", () => {
			const content = "---\nname: test-skill\ndescription: A skill\n---\n\nBody"
			expect(handler.transform(content, "skill", "test-skill")).toBe(content)
		})

		it("should transform agent with Claude Code tools", () => {
			const content = "---\nname: test\ndescription: test agent\n---\n# Body"
			const transformed = handler.transform(content, "agent", "test-agent")
			expect(transformed).toContain("name: test")
			expect(transformed).toContain("description: test agent")
			expect(transformed).toContain("tools:")
			expect(transformed).toContain("- Read")
			expect(transformed).toContain("- Edit")
			expect(transformed).toContain("- Write")
			expect(transformed).toContain("- Bash")
			expect(transformed).toContain("- Glob")
			expect(transformed).toContain("- Grep")
			expect(transformed).toContain("- WebFetch")
			expect(transformed).toContain("- WebSearch")
		})

		it("should remove target field from agent frontmatter", () => {
			const content =
				"---\nname: test\ndescription: test\ntarget: github-copilot\n---\n# Body"
			const transformed = handler.transform(content, "agent", "test-agent")
			expect(transformed).not.toContain("target:")
		})

		it("should handle agents without frontmatter", () => {
			const content = "# Simple Body"
			const transformed = handler.transform(content, "agent", "simple-agent")
			expect(transformed).toContain("name: simple-agent")
			expect(transformed).toContain("tools:")
			expect(transformed).toContain("- Read")
			expect(transformed).toContain("# Simple Body")
		})

		it("should handle invalid yaml frontmatter in agents", () => {
			const content = "---\ninvalid: yaml: : :\n---\n# Body"
			const transformed = handler.transform(content, "agent", "bad-yaml")
			expect(transformed).toContain("name: bad-yaml")
			expect(transformed).toContain("tools:")
		})

		it("should transform workflow to skill format", () => {
			const content = "# My Workflow\nDo the thing"
			const transformed = handler.transform(
				content,
				"workflow",
				"test-workflow",
			)
			expect(transformed).toContain("name: test-workflow")
			expect(transformed).toContain("description: 'Workflow: My Workflow'")
			expect(transformed).toContain("user-invocable: true")
			expect(transformed).toContain("# My Workflow")
		})

		it("should use description from workflow frontmatter", () => {
			const content =
				"---\nname: wf\ndescription: Custom description\n---\n# Title\nBody"
			const transformed = handler.transform(content, "workflow", "my-wf")
			expect(transformed).toContain("description: Custom description")
			expect(transformed).toContain("user-invocable: true")
		})

		it("should handle workflow without title", () => {
			const content = "Just some content without a title"
			const transformed = handler.transform(content, "workflow", "no-title")
			expect(transformed).toContain("name: no-title")
			expect(transformed).toContain("user-invocable: true")
		})

		it("should return unknown types as-is", () => {
			const content = "# Unknown"
			expect(handler.transform(content, "unknown", "test")).toBe(content)
		})
	})
})
