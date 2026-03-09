# Track Specification - Markdown Linting Guideline

## Overview

This track introduces a new guideline for working with markdown files within the project. It ensures all generated or modified markdown files adhere to the project's standards defined in `.markdownlint.json` by using targeted linting.

## Requirements

### Guideline Definition

- **File Location**: Create a new file `conductor/code_styleguides/markdown.md`.
- **Core Rule**: All markdown files MUST follow the ruleset defined in `.markdownlint.json`.
- **Linting Strategy**: Never lint the entire project. Only lint the newly generated or modified markdown files for the current task.
- **Enforcement**: Integrate this as a mandatory step in the project's standard task workflow.

### Implementation Command

- **Command**: `pnpm lint:md <file_path>`
- **Correction Protocol**: If linting issues are found, use `pnpm markdownlint <file_path> --fix` to resolve them automatically where possible.

### Workflow Integration

- Update `conductor/workflow.md` to include a markdown linting step in the **Standard Task Workflow**.

## Acceptance Criteria

- A new `markdown.md` guideline exists in `conductor/code_styleguides/`.
- `conductor/workflow.md` explicitly mentions the markdown linting requirement for each task.
- The guideline clearly states the use of `pnpm lint:md` for specific files only.
- Success is defined as a clean lint report for all markdown files modified during a task implementation.

## Out of Scope

- Modifying existing markdown files that are not part of a current task's scope.
- Updating the global `.markdownlint.json` configuration.
