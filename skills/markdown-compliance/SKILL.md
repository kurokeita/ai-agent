---
name: markdown-compliance
description: Strict guidelines and enforcement of markdownlint rules. Use this skill to ensure all generated markdown files are syntactically correct and render flawlessly across platforms.
---

# Markdown Compliance Skill

This skill defines the strict standards for markdown files in this project, based on `markdownlint` rules (MD001-MD050+). All agents and tools MUST adhere to these rules when generating documentation, logs, or agent definitions.

## 1. Heading Rules (Structure)

- **MD001 (Level 1)**: Header levels must increase by one level at a time.
  - Example: `H1` -> `H2` -> `H3` (Correct). `H1` -> `H3` (Incorrect).
- **MD002 (First Header)**: The first header in the file should be a top-level header (H1).
- **MD003 (Style)**: Use ATX style (`# Heading`) exclusively. Do NOT use Setext style (`Heading\n---`).
- **MD018 (Space after hash)**: Always put a space after the hash characters. (`# Title`, not `#Title`).
- **MD019 (No multiple spaces)**: Only one space after hash.
- **MD022 (Blanks around)**: Headings must be surrounded by a blank line (one before, one after).
  - *Exception*: The first line of the file (if H1) doesn't need a blank line before it.
- **MD023 (Start of line)**: Headings must start at the beginning of the line (no indentation).
- **MD024 (Duplicate)**: Avoid duplicate headings in the same document level if possible.
- **MD025 (Single H1)**: Document must have exactly one H1 header.
- **MD036 (Emphasis)**: Do not use emphasis (bold/italic) as a substitute for a heading.
- **MD041 (First Line)**: The file should start with an H1 heading (unless it has frontmatter, then H1 comes after).

## 2. List Rules (Structure & Spacing)

- **MD004 (Unordered Style)**: Use **hyphens** (`-`) for unordered lists.
- **MD005 (Inconsistent Indent)**: Consistency is key.
- **MD006 (Start Bullet)**: Top-level lists must start at the beginning of the line.
- **MD007 (Indentation)**: Use **2 spaces** for indentation of sub-lists.
- **MD029 (Ordered Style)**: Use sequential numbering (`1.`, `2.`, `3.`) for clarity, or `1.` for all items if lazy numbering is preferred (Agent preference: **Sequential**).
- **MD030 (Marker Spacing)**: Strictly **1 space** after the list marker.
  - Correct: `- Item`
  - Incorrect: `-  Item`
- **MD032 (Blanks around)**: Lists must be separated from other content (headers, paragraphs) by blank lines.

## 3. Code Block Rules

- **MD014 (Dollar Sign)**: Do not use `$` output for shell commands unless showing output separate from command.
- **MD031 (Blanks around)**: Fenced code blocks must be surrounded by blank lines.
  - *Critical constraint*: If a code block is nested in a list, the blank lines must respect the list's scope.
- **MD040 (Language)**: Fenced code blocks must have a language specified (e.g., `bash`, `python`, `markdown`).
  - *Exception*: If the language cannot be detected or is not applicable, wrap the code block with `<!-- markdownlint-disable MD040 -->` and `<!-- markdownlint-enable MD040 -->` to suppress the warning.
- **MD046 (Style)**: Use **Fenced** code blocks (` ``` `) exclusively. Do NOT use indented code blocks.
- **MD048 (Style)**: Use backticks (`) for code fences. Do not use tildes (~).

## 4. Line & Character Rules

- **MD009 (Trailing Spaces)**: No trailing spaces at the end of lines.
- **MD010 (Hard Tabs)**: Do not use hard tabs. Use spaces.
- **MD012 (Multiple Blanks)**: No consecutive blank lines (max 1).
- **MD034 (Bare URLs)**: URLs should be enclosed in angle brackets (`<http://...>`) or formatted as links `[text](url)` properly.
- **MD037 (Space in emphasis)**: No spaces inside emphasis markers.
  - Correct: `**Text**`
  - Incorrect: `** Text **`
- **MD039 (Space in links)**: No spaces inside link text brackets. `[ Text ]` -> `[Text]`.
- **MD047 (Final newline)**: Files should end with a single newline character.

## 5. HTML & Frontmatter

- **MD033 (Inline HTML)**: Avoid raw HTML if possible.
  - *Exception*: `<br>` is sometimes acceptable for line breaks in tables.
  - *Agent Exception*: `<use_mcp_tool>` or similar XML-like tags used for agent logic are NOT standard HTML and should be wrapped in code blocks or handled carefully to not break markdown parsing.
- **Frontmatter**: Must be at the very top of the file, delimited by `---`.
- **Spacing after Frontmatter**: Ensure a blank line exists between the closing `---` and the first H1.

## 6. Implementation Checklist for Agents

When generating a file, run this mental check:

1. **H1 Present?** Is it the first real line?
2. **Blanks Everywhere?** Before/after headers? Before/after lists? Before/after code blocks?
3. **Indentation?** Are sub-lists indented by exactly 2 spaces?
4. **Markers?** Is there exactly one space after `-` or `1.`?
5. **Fences?** Are all code blocks fenced with a language?

## Example of Compliant Markdown

```markdown
---
name: example-agent
---

# Title of the Document

This is a paragraph description.

## Section Header (MD022 applied)

- List item 1 (MD004: dash)
- List item 2
  - Sub-item (MD007: 2 spaces)

### Code Section

Here is a script:

```bash
echo "Hello World"
```

End of document.
