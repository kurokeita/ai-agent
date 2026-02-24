# Track Specification - Status Command

## Overview

Implement a `status` command for the `ai-agent` CLI. This command provides a high-level summary of the current project's health and lists all installed AI components (skills, agents, workflows).

## Requirements

### Command Structure

- **Command**: `ai-agent status`
- **Options**:
  - `--verbose`: Show detailed information about each item (e.g., path, author, license).

### Functional Requirements

- **Item Discovery**: Correctly identify and list all installed items in the standard locations:
  - `skills/`
  - `agents/`
  - `workflows/`
- **Validation**:
  - Check for existence of required files (e.g., `SKILL.md` for skills).
  - Verify item names and versions from metadata (if available).
- **Summary**:
  - Total count of installed skills, agents, and workflows.
  - Project version and license (from `package.json`).
- **Health Check**:
  - Report any items with missing files or invalid structure.

### User Interface

- Use `@clack/prompts` for a consistent and interactive look.
- Use `picocolors` for semantic highlighting (e.g., green for healthy, red for errors).
- Output should be a structured list or table-like format.

## Technical Considerations

- **Modular Integration**: Implement the command in `src/commands/status.ts` and register it in `bin/cli.ts`.
- **Utility Reuse**: Reuse existing path utilities from `src/utils/paths.ts` and GitHub utilities from `src/utils/github.ts` if needed.
- **Error Handling**: Gracefully handle missing directories or invalid item structures.

## Success Criteria

- `ai-agent status` runs without errors.
- Correctly lists all installed items.
- Provides an accurate summary of the project's health.
- Output follows the project's established UX and visual style.
