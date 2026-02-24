# Implementation Plan - Gemini CLI Workflow Migration

## Phase 1: Foundation and Infrastructure

- [ ] Task: Create initial structure for Gemini commands directory.
  - [ ] Implement logic to ensure `.gemini/commands/` exists when installing for Gemini.
- [ ] Task: Implement TOML transformation logic.
  - [ ] Implement the transformation function (extracting description and wrapping prompt).
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation and Infrastructure' (Protocol in workflow.md)

## Phase 2: Core Implementation

- [ ] Task: Update the `add workflow` command logic.
  - [ ] Modify the installation loop to handle Gemini-specific renaming and transformation.
- [ ] Task: Implement basic TOML validation.
  - [ ] Implement the validation check (syntax and required fields).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Core Implementation' (Protocol in workflow.md)

## Phase 3: Migration Tooling and Validation

- [ ] Task: Create the migration helper command.
  - [ ] Implement the migration tool (bulk converting .md to .toml).
- [ ] Task: Verify dual support and legacy compatibility.
  - [ ] Perform manual verification of dual support.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Migration Tooling and Validation' (Protocol in workflow.md)

## Phase 4: Finalization and Cleanup

- [ ] Task: Ensure basic documentation update.
  - [ ] Update JSDoc and internal documentation.
- [ ] Task: Final project-wide linting and formatting.
  - [ ] Run `pnpm run lint` and `pnpm run format`.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Finalization and Cleanup' (Protocol in workflow.md)
