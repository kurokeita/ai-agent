/**
 * Converts Markdown content to the Gemini CLI Custom Command TOML format.
 *
 * @param markdownContent The original Markdown content.
 * @returns A string in TOML format with description and prompt fields.
 */
export function convertToGeminiCommandTOML(markdownContent: string): string {
	// Extract description: find the first line starting with #, or the first non-empty line
	const lines = markdownContent.split("\n");
	let description = "";

	for (const line of lines) {
		const trimmedLine = line.trim();
		if (trimmedLine) {
			// If it's a heading, strip the # and use it
			if (trimmedLine.startsWith("#")) {
				description = trimmedLine.replace(/^#+\s*/, "");
			} else {
				description = trimmedLine;
			}
			break;
		}
	}

	// Limit description length for the help menu
	if (description.length > 100) {
		description = `${description.substring(0, 97)}...`;
	}

	// Escape triple quotes in the content if any (replace """ with \"\"\" )
	// TOML multi-line strings end at the first unescaped """
	const escapedContent = markdownContent.replace(/"""/g, '\\"\\"\\"');

	return `description = ${JSON.stringify(description)}

prompt = """
${escapedContent.trim()}
"""
`;
}
