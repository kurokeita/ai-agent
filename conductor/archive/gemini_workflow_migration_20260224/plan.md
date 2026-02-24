# Implementation Plan - Gemini CLI Workflow Migration

## Phase 1: Foundation and Infrastructure [checkpoint: ac828a8]

- [x] Task: Create initial structure for Gemini commands directory. [ac828a8]
  - [x] Implement logic to ensure `.gemini/commands/` exists when installing for Gemini.
- [x] Task: Implement TOML transformation logic. [ac828a8]
  - [x] Implement the transformation function (extracting description and wrapping prompt).
- [x] Task: Conductor - User Manual Verification 'Phase 1: Foundation and Infrastructure' (Protocol in workflow.md) [ac828a8]

## Phase 2: Core Implementation [checkpoint: 08a4781]

- [x] Task: Update the `add workflow` command logic. [4aa80bb]
  - [x] Modify the installation loop to handle Gemini-specific renaming and transformation.
- [x] Task: Implement basic TOML validation. [08a4781]
  - [x] Implement the validation check (syntax and required fields).
- [x] Task: Conductor - User Manual Verification 'Phase 2: Core Implementation' (Protocol in workflow.md) [08a4781]

## Phase 3: Legacy Compatibility and Validation [checkpoint: 689d438]

- [x] Task: Refine TOML transformation logic. [860e439]
  - [x] Extract cleaner descriptions and handle triple-quote escaping.
- [x] Task: Verify dual support and legacy compatibility. [689d438]
  - [x] Perform manual verification of dual support.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Validation' (Protocol in workflow.md) [689d438]

## Phase 4: Finalization and Cleanup [checkpoint: eb127dd]

- [x] Task: Ensure basic documentation update. [eb127dd]
  - [x] Update JSDoc and internal documentation.
- [x] Task: Final project-wide linting and formatting. [eb127dd]
  - [x] Run `pnpm run lint` and `pnpm run format`.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Finalization and Cleanup' (Protocol in workflow.md) [eb127dd]
