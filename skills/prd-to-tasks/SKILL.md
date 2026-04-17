---
name: prd-to-tasks
description: >
  Break a local PRD into independently grabbable implementation tasks using vertical slices, then save them under
  .prd/{prd-name}/tasks/ in the current workspace. Use when the user wants to convert a PRD to tasks, break a spec
  into actionable work, slice a PRD, or create implementation tasks from a local planning document. Do NOT trigger
  for: writing PRDs, reviewing PRDs without task creation, or remote work item management systems.
argument-hint: "[prd-name]"
---

# PRD to Tasks

Break a local PRD into independently grabbable implementation tasks using vertical slices.

Input location:

- PRD directory: `.prd/{prd-name}/`
- Source PRD: `.prd/{prd-name}/prd.md`

Output location:

- Tasks directory: `.prd/{prd-name}/tasks/`
- Optional index: `.prd/{prd-name}/tasks/README.md`

`{prd-name}` should be a filesystem-safe kebab-case slug. If the user provides a title instead, normalize it to a slug
and state the slug you used.

## Step 1: Locate the PRD

If the user provided `$ARGUMENTS`, treat that as the PRD name and normalize it.

If not, ask which PRD directory to use.

Then:

1. Confirm `.prd/{prd-name}/prd.md` exists
2. Read it fully
3. Check whether `.prd/{prd-name}/tasks/` already exists
4. If task files already exist, summarize them and ask whether to overwrite, append, or regenerate selectively

If the PRD does not exist, stop and tell the user exactly which path is missing.

## Step 2: Explore the codebase

If you have not already explored the relevant code in this conversation, do so now:

1. Read top-level architecture guidance if present
2. Search for code related to the PRD concepts
3. Read nearby guidance files for affected subsystems
4. Look for similar features and test patterns

The PRD tells you *what* to build. The codebase tells you enough about *where* and *how* to create useful tasks.

## Step 3: Draft vertical slices

Break the PRD into **tracer bullet** tasks.

### What is a tracer bullet?

A tracer bullet is a thin vertical slice through the whole feature path. It proves that the relevant layers connect
correctly end to end. It is not a horizontal "build all backend first, then all UI" slice.

Prefer slices that are:

- Independently verifiable
- Demoable on their own
- Thin and end to end
- Ordered by dependency

### HITL vs AFK

Each slice should be marked:

- `HITL`: needs human input, review, testing on real devices, design signoff, or external coordination
- `AFK`: can be implemented and validated without waiting on a person

### Vertical slice rules

- Each slice should deliver a complete behavior, not one technical layer
- Prefer many thin slices over a few broad ones
- Use the PRD's module design to inform slicing, but do not create one task per module
- Order slices so blockers come first

## Step 4: Quiz the user

Present the proposed slices as a numbered list. For each slice, include:

- Title
- Type: `HITL` or `AFK`
- Blocked by
- User stories covered

Ask the user whether:

- The granularity is right
- The dependencies are correct
- Any slices should be merged or split
- The `HITL` versus `AFK` labels are accurate

Iterate until approved.

## Step 5: Write task files

Only write files after the user approves the breakdown.

Create `.prd/{prd-name}/tasks/` if needed.

Create one Markdown file per task using zero-padded numeric prefixes:

- `.prd/{prd-name}/tasks/01-{task-slug}.md`
- `.prd/{prd-name}/tasks/02-{task-slug}.md`

`{task-slug}` should be kebab-case and derived from the task title.

Each task file should use this structure:

```md
# {Task title}

- Type: AFK | HITL
- Status: Proposed
- Blocked by: None | 01-other-task
- Source PRD: ../prd.md

## What to Build

Concise description of the vertical slice. Describe end-to-end behavior, not a layer-by-layer checklist.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## User Stories Addressed

- User story 3
- User story 7

## Notes

- Optional implementation hints grounded in the current codebase
- Reference relevant modules or concepts, but avoid binding the task to fragile file-level details unless necessary
```

Also create or update `.prd/{prd-name}/tasks/README.md` with:

- The PRD title
- The approved slice list in dependency order
- A short summary of each task

## Important constraints

- Do not modify `prd.md` unless the user asks
- Do not delete existing task files unless the user explicitly approves replacement
- If existing tasks overlap the proposed slices, call that out before writing duplicates

## After writing

Summarize:

- The PRD slug used
- The task files created or updated
- Any existing task files that were preserved
