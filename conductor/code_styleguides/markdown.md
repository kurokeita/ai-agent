# Markdown Code Style Guide

## Core Principles

1. **Adherence to Ruleset:** All markdown files MUST follow the project's ruleset defined in `.markdownlint.json`.
2. **Targeted Linting:** Never lint the entire project. Only lint the newly generated or modified markdown files for the current task.
3. **Task Workflow Requirement:** Markdown linting is a mandatory step in the project's standard task workflow.

## Commands

### Linting a Markdown File

To lint a specific markdown file, use the following command:

```bash
pnpm lint:md <file_path>
```

### Auto-Correction

If linting issues are found, you can use the following command to automatically fix them where possible:

```bash
pnpm markdownlint <file_path> --fix
```

## Enforcement

- This style guide is enforced as part of the implementation workflow.
- Every task that modifies or adds a markdown file must verify its compliance using the commands above.
