import { describe, expect, it } from "vitest"
import { AntigravityHandler } from "../antigravity"
import { DefaultHandler } from "../default"
import { WindsurfHandler } from "../windsurf"

describe("Platform Handlers", () => {
	describe("AntigravityHandler", () => {
		const handler = new AntigravityHandler()
		it("should return same filename", () => {
			expect(handler.getTargetFileName("test", "skill")).toBe("test")
		})
		it("should return same content", () => {
			expect(handler.transform("content", "skill", "test")).toBe("content")
		})
	})

	describe("DefaultHandler", () => {
		const handler = new DefaultHandler("custom")
		it("should return same filename", () => {
			expect(handler.getTargetFileName("test", "skill")).toBe("test")
		})
		it("should return same content", () => {
			expect(handler.transform("content", "skill", "test")).toBe("content")
		})
		it("should have correct platform", () => {
			expect(handler.platform).toBe("custom")
		})
		it("should default to 'default' platform", () => {
			const def = new DefaultHandler()
			expect(def.platform).toBe("default")
		})
	})

	describe("WindsurfHandler", () => {
		const handler = new WindsurfHandler()
		it("should return same filename for non-agent", () => {
			expect(handler.getTargetFileName("test", "skill")).toBe("test")
		})
		it("should return AGENTS.md for agent", () => {
			expect(handler.getTargetFileName("my-agent.md", "agent")).toContain(
				"my-agent/AGENTS.md",
			)
		})
		it("should return same content", () => {
			expect(handler.transform("content", "skill", "test")).toBe("content")
		})
	})
})
