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
- [ ] Task: Implement Gemini Handler
  - [ ] Write tests for `.toml` naming and TOML conversion.
  - [ ] Implement `src/utils/platforms/gemini.ts`.
- [ ] Task: Implement Default/Null Handler
  - [ ] Create a fallback for other types or platforms.

## Phase 3: Integration & Verification

- [ ] Task: Refactor `src/commands/add.ts`
  - [ ] Replace inline transformation and installation logic with calls to the new registry.
- [ ] Task: Cleanup & Verification
  - [ ] Remove `src/utils/agents.ts` (old file) and fix `src/utils/__tests__/agents.test.ts`.
  - [ ] Manual Verification — 'Full installation flow for agents'.
