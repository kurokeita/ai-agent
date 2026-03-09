# Implementation Plan: Fully Interactive Command Loops

## Phase 1: Interactive Add Command
- [ ] Task: Refactor `src/commands/add.ts` for looping
    - [ ] Modify `add` function signature to handle optional `type`.
    - [ ] Implement a `while (true)` loop for the main flow.
    - [ ] Add a `select` prompt for type/exit.
- [ ] Task: Verification
    - [ ] Manual verification of the loop flow.

## Phase 2: Interactive List Command
- [ ] Task: Refactor `src/commands/list.ts` for looping
    - [ ] Implement a similar loop structure for listing.
    - [ ] Allow switching between types and potentially view modes (local vs repo).
- [ ] Task: Verification
    - [ ] Manual verification of the listing loop.

## Phase 3: CLI Entrypoint Update
- [ ] Task: Update `bin/cli.ts`
    - [ ] Adjust command definitions to reflect optional parameters.
- [ ] Task: Final Polish & Linting
    - [ ] Ensure consistent messaging and "outro" usage.
    - [ ] Run `pnpm lint`.
