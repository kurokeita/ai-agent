---
name: make-instruction
description: Generates custom Copilot instruction files (.instructions.md) following official best practices. Use when you need to standardize code generation, reviews, or documentation for specific domains or file types.
---

# Make Instruction

This skill helps you generate custom instruction files for GitHub Copilot (`.github/instructions/*.instructions.md`) following the official "awesome-copilot" best practices.

## When to Use

Use this skill when you want to:

- Create a reusable prompt or context for Copilot.
- Standardize code generation for a specific language, framework, or library.
- Define code review guidelines for specific file types.
- Ensure consistent documentation styles.

## Workflow

1. **Identify the Need**: Determine what domain or specific task you need instructions for (e.g., "React Components", "Python Testing", "API Documentation").
2. **Define Scope**: Decide which files these instructions should apply to (e.g., `**/*.tsx`, `tests/*.py`).
3. **Generate Content**: using the template below, the agent will help you draft the content.

## Template

The generated file should look like this:

```markdown
---
description: 'Brief description of the instruction purpose and scope'
applyTo: 'glob pattern (e.g., **/*.ts)'
---

# [Title: e.g., React Component Guidelines]

[Brief introduction explaining the purpose and scope]

## General Instructions
[High-level guidelines and principles]

## Best Practices
- [Be Specific]
- [Show Why]

## Code Standards
[Naming conventions, formatting, style rules]

## Examples

### Good Example
\`\`\`language
// Recommended approach
code example here
\`\`\`

### Bad Example
\`\`\`language
// Avoid this pattern
code example here
\`\`\`
```

## Tips for Success

- **Be Specific**: Copilot works best with concrete examples.
- **Use "applyTo" Correctly**: Ensure the glob pattern hits the right files.
- **Keep it Updated**: As your project evolves, update these instructions.
