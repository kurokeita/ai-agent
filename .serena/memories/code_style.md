# Code Style and Conventions

## Markdown

- **Compliance**: All `.md` files must adhere to the rules defined in `skills/markdown-compliance/SKILL.md`.
  - **Headings**: ATX style (`# Heading`).
  - **Lists**: Hyphens (`-`) for unordered lists. 2-space indentation.
  - **Code Blocks**: Fenced blocks with language specified (` ```bash `). MD040 exception available for unknown languages.
  - **Linting**: Standard `markdownlint` rules MD001-MD050 apply.

## YAML Frontmatter

- **Required Fields**: `name`, `description`.
- **Description**: Must use third-person ("This skill should be used when...").

## File Naming

- **Skill Directory**: Kebab-case (e.g., `markdown-compliance`).
- **Definition File**: Must be named `SKILL.md` (all caps).
