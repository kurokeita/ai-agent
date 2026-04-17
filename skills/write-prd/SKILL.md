---
name: write-prd
description: >
  Create a developer-focused PRD through user interview, codebase exploration, and module design, then save it
  under .prd/{prd-name}/ in the current workspace. Use when the user wants to write a PRD, create a product
  requirements document, plan a new feature, spec out work, or define requirements for implementation. Also
  trigger when the user says things like "let's plan this feature", "I need a spec for...", "write requirements
  for...", or "create a PRD for...". Do NOT trigger for: reviewing existing PRDs, creating child tasks from a PRD,
  or general project management outside the local PRD directory.
argument-hint: "[prd-name]"
---

# Write a PRD

Create a developer-focused Product Requirements Document and save it to the local workspace instead of a remote tracker.
The PRD captures the *what* and *why* of a feature, not line-level implementation details.

During the interview phase, explicitly use the `grill-me` skill if it is available in the current workspace. Treat
that skill as the driver for the questioning loop, while this skill remains responsible for codebase exploration,
module design, PRD drafting, and filesystem output.

Output location:

- Directory: `.prd/{prd-name}/`
- Primary document: `.prd/{prd-name}/prd.md`
- Optional notes captured during planning: `.prd/{prd-name}/notes.md`

`{prd-name}` should be a filesystem-safe kebab-case slug. If the user provides a title with spaces or punctuation,
normalize it to kebab-case and tell the user which slug you used.

You may skip steps if they are clearly unnecessary, but do not rush. The value of this skill is in forcing clarity.

## Step 1: Establish the PRD target

If the user provided `$ARGUMENTS`, treat that as the intended PRD name and normalize it to a slug.

If not, ask for the PRD name before writing files.

Before creating files:

- Check whether `.prd/{prd-name}/` already exists
- If it exists, read `prd.md` if present and summarize the current state
- Ask whether the user wants to overwrite the PRD, revise it in place, or create a new slug

## Step 2: Get the problem description

Ask the user for a long, detailed description of the problem they want to solve and any candidate solutions they already
have in mind.

If an existing `.prd/{prd-name}/prd.md` exists, summarize it first so the user can correct or extend it instead of repeating
context.

## Step 3: Explore the codebase

Before interviewing, ground yourself in the actual codebase:

1. Read the top-level `README.md`, `AGENTS.md`, or other architectural guidance if present
2. Search broadly for relevant terms, domain concepts, and adjacent implementations
3. Read area-specific guidance files when relevant
4. Look for similar features, patterns, and existing terminology

Do not try to read everything. Use search-driven exploration to understand the current state well enough to ask informed
questions and write an accurate PRD.

## Step 4: Interview relentlessly

Invoke the `grill-me` skill for this phase if available, then interview the user until you reach shared understanding.
Walk down each branch of the design tree and resolve dependencies one by one.

Ask one question at a time. Keep going until ambiguity is removed.

Ask about:

- Edge cases and failure scenarios
- Existing behavior that must be preserved
- What success looks like from the user's perspective
- Who the end users are
- Constraints from architecture, rollout, compatibility, or operations

Continue exploring the codebase while interviewing. If a question can be answered by inspecting code, inspect code instead
of asking the user.

### Scope check

If it becomes clear the work is too large for one PRD, tell the user and ask whether to narrow the scope or continue with
a larger document that will later be split into multiple execution tracks.

## Step 5: Sketch module design

Sketch the major conceptual modules to build or modify. Look for opportunities to define **deep modules**:

- Interfaces simpler than the implementation they hide
- Testable in isolation
- Internals can change without rippling outward

Check that these modules match the user's expectations and ask which ones need stronger test coverage.

## Step 6: Draft the PRD and get approval

Write the PRD and show it to the user for approval before saving or overwriting `prd.md`.

The PRD should be durable:

- Do describe conceptual modules, responsibilities, interfaces, and data flow
- Do describe architectural patterns and decisions
- Do not reference specific file paths, class names, or step-by-step implementation procedures
- Do not include code snippets unless the user explicitly asks for them

Use this structure:

```md
# {Human-readable PRD title}

## Problem Statement

## Solution

## User Stories
1. As a ...

## Module Design
### {Module name}
- Responsibility:
- Interface:
- Status: new | existing
- Depth: deep | shallow

## Implementation Decisions

## Testing Decisions

## Out of Scope

## Open Questions
```

Omit `Open Questions` if none remain.

## Step 7: Save to the filesystem

Only save after the user approves the PRD.

Create `.prd/{prd-name}/` if it does not exist.

Write:

- `.prd/{prd-name}/prd.md`: the approved PRD

Optionally write:

- `.prd/{prd-name}/notes.md`: short working notes, unresolved investigation points, or source references gathered during
  discovery. Keep this concise and operational, not user-facing.

Do not create extra files unless they add real value.

## After saving

Tell the user:

- The slug used
- The files created or updated
- Whether this was a new PRD or a revision of an existing directory
