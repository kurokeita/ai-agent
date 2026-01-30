---
name: make-prompt
description: Generates custom Copilot prompt files (.prompt.md) following official best practices. Use when you need to create structured, reusable prompts for complex tasks, code generation, or architectural planning.
---

# Make Prompt

This skill helps you generate custom prompt files (`.prompt.md`) for GitHub Copilot following the official "awesome-copilot" best practices and the "Professional Prompt Builder" guide.

## When to Use

Use this skill when you want to:

- Create structured, reusable prompts for complex tasks.
- Define a specific persona or expertise level for Copilot.
- Create blueprints, implementation plans, or specifications.
- Ensure consistent output formats for code generation or analysis.

## Workflow

1. **Discovery**: Identify the Identity, Persona, Task, Context, Instructions, Output, Tools, and Validation criteria.
2. **Generate**: Create the `.prompt.md` file using the template below.

## Template

The generated file should look like this:

```markdown
---
description: "[Clear, concise description from requirements]"
agent: "[agent|ask|edit based on task type]"
tools: ["[appropriate tools based on functionality]"]
model: "[only if specific model required]"
---

# [Prompt Title]

[Persona definition - specific role and expertise]
Example: "You are a senior .NET architect with 10+ years of experience..."

## [Task Section]
[Clear task description with specific requirements]

## [Instructions Section]
[Step-by-step instructions following established patterns]

## [Context/Input Section] 
[Variable usage and context requirements]
Example: "Uses \${selection} and \${file}"

## [Output Section]
[Expected output format and structure]

## [Quality/Validation Section]
[Success criteria and validation steps]
```

## Checklist for Quality

- ✅ **Clear Structure**: Logical flow.
- ✅ **Specific Instructions**: Actionable directions.
- ✅ **Proper Context**: All necessary info is included.
- ✅ **Tool Integration**: Correct tools selected.
- ✅ **Error Handling**: Guidance for edge cases.

## Tools Reference

- **File Operations**: `codebase`, `editFiles`, `search`, `problems`
- **Execution**: `runCommands`, `runTasks`, `runTests`, `terminalLastCommand`
- **External**: `fetch`, `githubRepo`, `openSimpleBrowser`
