# Implementation Plan: Platform-specific Agent Transformations

## Phase 1: Architectural Refactoring & Filtering

- [x] Task: Implement Platform Filtering in CLI 3f4439f
  - [x] Update `src/commands/add.ts` to filter `getPlatformOptions` based on `type`.
- [x] Task: Create Platform Handler Infrastructure 0d682ab
  - [x] Create `src/utils/platforms/types.ts` (Interface definition).
  - [x] Create `src/utils/platforms/index.ts` (Registry).

## Phase 2: Platform Handlers (TDD)

- [x] Task: Implement Copilot Handler 00a266f
  - [x] Write tests for `.agent.md` naming and frontmatter injection.
  - [x] Implement `src/utils/platforms/copilot.ts`.
- [x] Task: Implement Gemini Handler b6c3ee1
  - [x] Write tests for `.toml` naming and TOML conversion.
  - [x] Implement `src/utils/platforms/gemini.ts`.
- [x] Task: Implement Default/Null Handler 317369e
  - [x] Create a fallback for other types or platforms.

## Phase 3: Integration & Verification

- [x] Task: Refactor `src/commands/add.ts` 5d4ed41
  - [x] Replace inline transformation and installation logic with calls to the new registry.
- [x] Task: Cleanup & Verification 43f6f51
  - [x] Remove `src/utils/agents.ts` (old file) and fix `src/utils/__tests__/agents.test.ts`.
  - [x] Manual Verification — 'Full installation flow for agents'.
