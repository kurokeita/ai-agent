import { describe, expect, it } from "vitest";
import {
	convertToGeminiCommandTOML,
	validateGeminiCommandTOML,
} from "../toml.ts";

describe("src/utils/toml.ts", () => {
	describe("convertToGeminiCommandTOML", () => {
		it("should extract description from H1 header", () => {
			const markdown = "# Test Command\nThis is a prompt.";
			const toml = convertToGeminiCommandTOML(markdown);
			expect(toml).toContain('description = "Test Command"');
			expect(toml).toContain(
				'prompt = """\n# Test Command\nThis is a prompt.\n"""',
			);
		});

		it("should extract description from first non-empty line", () => {
			const markdown = "This is the description.\n\nMore prompt.";
			const toml = convertToGeminiCommandTOML(markdown);
			expect(toml).toContain('description = "This is the description."');
		});

		it("should truncate long descriptions", () => {
			const longDesc = "A".repeat(150);
			const markdown = `${longDesc}\nPrompt content.`;
			const toml = convertToGeminiCommandTOML(markdown);
			expect(toml).toContain(`description = "${"A".repeat(97)}..."`);
		});

		it("should handle markdown with horizontal rules and comments", () => {
			const markdown = "---\n<!-- comment -->\n# Real Title\nContent.";
			const toml = convertToGeminiCommandTOML(markdown);
			expect(toml).toContain('description = "Real Title"');
		});

		it("should escape triple quotes in prompt", () => {
			const markdown = 'Prompt with """triple quotes""".';
			const toml = convertToGeminiCommandTOML(markdown);
			expect(toml).toContain(
				'prompt = """\nPrompt with \\"\\"\\"triple quotes\\"\\"\\".\n"""',
			);
		});
	});

	describe("validateGeminiCommandTOML", () => {
		it("should return valid for correct TOML", () => {
			const toml = 'description = "Test"\nprompt = """\nContent\n"""';
			const result = validateGeminiCommandTOML(toml);
			expect(result.valid).toBe(true);
		});

		it("should return error for missing prompt field", () => {
			const toml = 'description = "Test"';
			const result = validateGeminiCommandTOML(toml);
			expect(result.valid).toBe(false);
			expect(result.error).toBe(
				'Missing required "prompt" field with """ wrapping.',
			);
		});

		it("should return error for unterminated prompt", () => {
			const toml = 'prompt = """\nUnterminated content';
			const result = validateGeminiCommandTOML(toml);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('Unterminated "prompt" multi-line string.');
		});
	});
});
