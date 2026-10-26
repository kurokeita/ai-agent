# Architectural & Design Patterns

This document details the recurring architectural, design, and structural patterns found in this codebase.

## 1. Command Action Separation

- **Intent**: Separate command-line argument parsing and CLI interface definitions from the actual execution business logic.
- **Location/Example**: [bin/cli.ts:L82-L121](../bin/cli.ts#L82-L121) (Command registration) and [src/commands/add.ts](../src/commands/add.ts) (Command execution logic).
- **Implementation Details**:
  - `bin/cli.ts` configures command signatures and parameters using `commander`.
  - The business logic is isolated in standalone handler functions (e.g., `add`, `list`, `remove`) in the `src/commands/` directory, keeping CLI routing clean and testable.

## 2. Interactive Prompts Loop

- **Intent**: Provide a user-friendly interactive terminal wizard for users executing the tool with no command-line arguments.
- **Location/Example**: [bin/cli.ts:L43-L79](../bin/cli.ts#L43-L79).
- **Implementation Details**:
  - Uses `@clack/prompts` for interactive elements such as lists, text prompts, and confirmations.
  - Keeps the interactive session alive in a `while (true)` loop until the user cancels or selects the "Exit" option.

## 3. Contextual Scope Resolution

- **Intent**: Validate if the requested installation scope (`global` vs `project`) is allowed based on the system context.
- **Location/Example**: [src/utils/scope.ts:L31-L52](../src/utils/scope.ts#L31-L52).
- **Implementation Details**:
  - Uses `git rev-parse --is-inside-work-tree` to verify if the working directory is inside a git repository.
  - Refuses project-scope operations if the current working directory equals the home directory or is outside a git repository.

## 4. Symlink Setup & Platform Mapping

- **Intent**: Standardize mapping of skills to platform-specific target directories.
- **Location/Example**: [src/utils/paths.ts:L43-L59](../src/utils/paths.ts#L43-L59) (Paths configurations) and [src/utils/agent-setup.ts:L30-L54](../src/utils/agent-setup.ts#L30-L54) (Link map generation).
- **Implementation Details**:
  - Maps the canonical `.agents/skills` folder to the skills directory each AI platform reads, for both global and project scope.
  - Generates format-specific configurations to link the centralized `.agents/skills` entries to their destinations on each supported platform.
