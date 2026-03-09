# Implementation Plan: Unified Interactive CLI Entry Point

## Phase 1: Entry Point Refactoring
- [~] Task: Update `bin/cli.ts`
    - [~] Define a main interactive loop when no subcommand is given.
    - [~] Create a `select` prompt for the main menu.
- [ ] Task: Ensure Commands return to loop
    - [ ] Verify `add`, `list`, `importItem`, and `remove` can be called repeatedly.

## Phase 2: Command Updates
- [x] Task: Refactor `src/commands/import.ts` for interactivity
    - [x] Ensure it can be used within the loop (e.g., prompt for URL if missing).
- [x] Task: Refactor `src/commands/remove.ts` for interactivity
    - [x] Add a loop or interactive selection for removal if not already present.

## Phase 3: Validation & Cleanup
- [~] Task: Final polish of messaging
- [ ] Task: Run `pnpm lint`
- [ ] Task: Update `package.json` description if needed.
