# Specification: Unified Interactive CLI Entry Point

## Overview
Refactor the CLI entry point to provide a single, fully interactive experience. Instead of forcing users to remember subcommands, running the base command should present a main menu to choose between adding, listing, importing, or removing items. The system should loop back to this main menu after each action until the user chooses to exit.

## Type
Feature

## Functional Requirements
- [FR-1]: **Main Interactive Loop**:
    - The default action of the CLI (when no subcommands are provided) starts a loop.
    - Presents a menu: "Add Item", "List Items", "Import from GitHub", "Remove Items", "Exit".
- [FR-2]: **Command Integration**:
    - Select "Add Item" calls the existing `add` logic.
    - Select "List Items" calls the existing `list` logic.
    - Select "Import from GitHub" calls the `importItem` logic.
    - Select "Remove Items" calls the `remove` logic.
- [FR-3]: **Persistent Session**:
    - After an action completes (e.g., a listing is displayed), return to the main menu.
- [FR-4]: **Backward Compatibility**:
    - Direct subcommand execution (e.g., `ai-agent list`) should still work for single-shot actions if possible, or be deprecated in favor of the loop.

## Acceptance Criteria
- [ ] Running `ai-agent` starts the interactive menu.
- [ ] Successfully adding a skill returns the user to the main menu.
- [ ] Selecting "Exit" or `Ctrl+C` terminates the process.
- [ ] All previous functionality (add/list/import/remove) is accessible via the menu.

## Out of Scope
- Major changes to the underlying command logic themselves (focus is on the entry point).
