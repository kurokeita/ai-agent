# Architectural & Design Patterns

This document details the recurring architectural, design, and structural patterns found in this codebase.

## 1. Command Action Separation

- **Intent**: Separate command-line argument parsing and CLI interface definitions from the actual execution business logic.
- **Location/Example**: [bin/cli.ts:L81-L122](../bin/cli.ts#L81-L122) (Command registration) and [src/commands/add.ts](../src/commands/add.ts) (Command execution logic).
- **Implementation Details**:
  - `bin/cli.ts` configures command signatures and parameters using `commander`.
  - The business logic is isolated in standalone handler functions (e.g., `add`, `list`, `remove`, `importItem`) in the `src/commands/` directory, keeping CLI routing clean and testable.

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

- **Intent**: Standardize mapping of skills, agents, and workflows to platform-specific target directories.
- **Location/Example**: [src/utils/paths.ts:L45-L68](../src/utils/paths.ts#L45-L68) (Paths configurations) and [src/utils/agent-setup.ts:L45-L73](../src/utils/agent-setup.ts#L45-L73) (Link map generation).
- **Implementation Details**:
  - Standardizes the subdirectory names (`skills`, `agents`, `commands`) that each AI platform requires.
  - Generates format-specific configurations to map the centralized `.agents/` source folders to their respective destinations on each supported platform.
