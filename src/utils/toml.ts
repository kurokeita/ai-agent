/**
 * Converts Markdown content to the Gemini CLI Custom Command TOML format.
 *
 * @param markdownContent The original Markdown content.
 * @returns A string in TOML format with description and prompt fields.
 */
export function convertToGeminiCommandTOML(markdownContent: string): string {
	// Extract description: find the first line that isn't empty, a horizontal rule, or just whitespace
	const lines = markdownContent.split("\n");
	let description = "";
	let descriptionLineIndex = -1;

	for (let i = 0; i < lines.length; i++) {
		const trimmedLine = lines[i].trim();
		// Skip empty lines, separators, and common non-description markers
		if (trimmedLine && trimmedLine !== "---" && !trimmedLine.startsWith("<!--")) {
			if (trimmedLine.startsWith("#")) {
				description = trimmedLine.replace(/^#+\s*/, "");
			} else {
				description = trimmedLine;
			}
			descriptionLineIndex = i;
			break;
		}
	}

	// Limit description length for the help menu
	if (description.length > 100) {
		description = `${description.substring(0, 97)}...`;
	}

	// Escape triple quotes in the content if any (replace """ with \"\"\" )
	const escapedContent = markdownContent.replace(/"""/g, '\\"\\"\\"');

	return `description = ${JSON.stringify(description)}

prompt = """
${escapedContent.trim()}
"""
`;
}

/**
 * Performs a basic validation of a Gemini Command TOML string.
 *
 * @param tomlContent The TOML content to validate.
 * @returns An object with valid boolean and optional error message.
 */
export function validateGeminiCommandTOML(tomlContent: string): {
	valid: boolean;
	error?: string;
} {
	// 1. Basic syntax check for prompt field
	if (!tomlContent.includes('prompt = """')) {
		return {
			valid: false,
			error: 'Missing required "prompt" field with """ wrapping.',
		};
	}

	// 2. Check for closing triple quotes
	const promptStart = tomlContent.indexOf('prompt = """');
	const rest = tomlContent.substring(promptStart + 'prompt = """'.length);
	if (!rest.includes('"""')) {
		return { valid: false, error: 'Unterminated "prompt" multi-line string.' };
	}

	return { valid: true };
}
