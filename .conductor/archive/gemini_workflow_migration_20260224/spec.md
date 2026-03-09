# Track Specification - Gemini CLI Workflow Migration

## Overview

This track modifies the installation logic for AI workflows to support the specific requirements of the Gemini CLI. For Gemini, workflow files must be renamed from `.md` to `.toml` and placed in the `.gemini/commands` directory. The content will be transformed into the Gemini CLI's detailed Custom Command format. For all other agents, the existing behavior will be preserved.

## Requirements

### Installation Logic Update

- **Trigger**: When a user runs `pnpx @kurokeita/add-skill add workflow`.
- **Target Platform Detection**: Detect if "Gemini CLI" is selected as a target platform.
- **Gemini-Specific Actions**:
  - Target Directory: `.gemini/commands/` (create if it doesn't exist).
  - File Conversion: Rename files from `*.md` to `*.toml`.
  - Content Transformation:
    - `description`: Extract the first heading or description from the original Markdown.
    - `prompt`: Wrap the entire original Markdown content in triple quotes (`"""`).
- **Other Platforms**: Preserve current behavior (copying Markdown files to defined paths).

### Technical Requirements

- **Detailed TOML Structure**:

  ```toml
  description = "One-line summary from the original file"
  prompt = """
  Original Markdown content goes here...
  """
  ```

- **Dual Support**: The system must maintain support for both the new Gemini TOML format and the legacy Markdown format during the transition.
- **Validation**: Implement a basic validator to ensure generated TOML files are syntactically correct and contain the required `prompt` field.

### Migration Tooling

- Implement a helper function or command to assist with the conversion of existing Markdown workflows to the new Gemini TOML format.

## Acceptance Criteria

- Running `add workflow` for Gemini CLI correctly places `.toml` files in `.gemini/commands`.
- The content of the `.toml` files follows the Gemini CLI Custom Command format.
- Installation for other platforms (e.g., Antigravity, Copilot, Windsurf) remains unchanged.
- A basic validation check confirms TOML integrity and required fields.

## Out of Scope

- Refactoring the core CLI command structure.
- Migrating non-workflow items (agents, skills) to TOML.
- Changing the global project configuration format.
