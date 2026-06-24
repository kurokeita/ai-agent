---
name: update-agents-md
description: Refactor a project's AGENTS.md (or CLAUDE.md) file to follow progressive disclosure. Use when requested to reorganize workspace instructions, reduce context bloat, group guidelines, or extract essential workflows.
---

# Update Agents MD

Refactor `AGENTS.md` (or `CLAUDE.md`) to follow progressive disclosure principles, ensuring context-window efficiency and clarity.

## Workflow

### 1. Analyze and Identify

- Read the existing `AGENTS.md` (or `CLAUDE.md`) file in the workspace root.
- Find contradictions or overlapping rules/instructions.
- Flag instructions that are redundant, vague, or overly obvious for deletion (e.g., basic IDE usage, standard Git commands, or generic advice).
- Identify the core essentials for the root file:
  - A one-line description of the project.
  - The package manager used (e.g., `npm`, `pnpm`, `yarn`, `bun`).
  - Core build, typecheck, lint, and test commands.
  - The 2–3 most critical workflows (e.g., local development, running tests, preparing a release).

### 2. User Alignment

- Present all identified contradictions, redundancies, and proposed deletions to the user.
- Ask the user which conflicting instructions to keep and confirm the items proposed for deletion.
- **Stop and wait** for explicit user confirmation before proceeding with modifications.

### 3. Extract and Delegate

- Group the remaining guidelines and instructions into clear, logical categories (e.g., database, testing, frontend styling, deployment).
- For each category, create a separate markdown file under a `docs/` folder (e.g., `docs/database-guidelines.md`).
- For any complex procedural instructions or task-specific workflows (e.g., how to run a custom migration script, how to publish a package), extract them into a local skill under `.agents/skills/<name>/SKILL.md`.

### 4. Construct Minimal Root File

- Re-write the root `AGENTS.md` (or `CLAUDE.md`) to be extremely minimal.
- Structure it to contain:
  1. A one-line description of the project.
  2. The package manager and build/typecheck commands.
  3. The 2–3 most critical workflows formatted as numbered steps.
  4. A list of links to the category files under `docs/` (e.g., `[Database Guidelines](docs/database.md)`), with a one-line description explaining when to consult each file.
- Replace verbose inline code snippets in instructions with precise `file:line` links pointing directly to the source code (e.g., `see [main.ts:L45-L60](file:///path/to/main.ts#L45-L60)`).
