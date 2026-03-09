# Implementation Plan: Fully Interactive Command Loops

## Phase 1: Interactive Add Command
- [x] Task: Refactor `src/commands/add.ts` for looping
    - [x] Modify `add` function signature to handle optional `type`.
    - [x] Implement a `while (true)` loop for the main flow.
    - [x] Add a `select` prompt for type/exit.
- [x] Task: Verification
    - [x] Manual verification of the loop flow.

## Phase 2: Interactive List Command
- [x] Task: Refactor `src/commands/list.ts` for looping
    - [x] Implement a similar loop structure for listing.
    - [x] Allow switching between types and potentially view modes (local vs repo).
- [x] Task: Verification
    - [x] Manual verification of the listing loop.

## Phase 3: CLI Entrypoint Update
- [x] Task: Update `bin/cli.ts`
    - [x] Adjust command definitions to reflect optional parameters.
- [x] Task: Final Polish & Linting
    - [x] Ensure consistent messaging and "outro" usage.
    - [x] Run `pnpm lint`.
