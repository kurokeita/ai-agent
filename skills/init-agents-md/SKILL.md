---
name: init-agents-md
description: Analyze a codebase to initialize or update its AGENTS.md (or CLAUDE.md) file, extract architectural patterns to docs/architectural_patterns.md, and procedural skills to .agents/skills/. Use when initializing a project's agent instructions, updating CLAUDE.md/AGENTS.md, or documenting project structure and workflows.
---

# Initialize Agent Instructions & Patterns

Use this skill to analyze a workspace and create or update standard developer onboarding and workflow guidelines.

## Workflow

### 1. Analyze Codebase

Explore the codebase to identify:

- **WHAT**: Core technology stack, languages, frameworks, main libraries.
- **WHY**: Core business logic or project purpose.
- **HOW**: Scripts and CLI commands (e.g., in package.json, Makefile, etc.).
- **Files/Docs**: Existing documentation, configuration files, and key source directories.
- **Workflows**: Critical operational workflows (specifically: build, test, release).

### 2. Generate or Update AGENTS.md

Create or update the `AGENTS.md` (or `CLAUDE.md`) file in the project root.

- Keep the file **under 150 lines** (optimum is 100–150 lines).
- Reference [agents_template.md](references/agents_template.md) for the structure.
- Follow these constraints strictly:
  1. Cover: WHAT (tech stack), WHY (purpose), and HOW (commands).
  2. Index all major documentation files or folders using progressive disclosure (one-line description each).
  3. Use **file:line references** (e.g., `src/main.ts:L42`) instead of embedding code snippets.
  4. Document exactly 2–3 critical workflows (e.g., build, test, release) as numbered steps.
  5. Do not include formatting or code styling rules (assume linters handle them).
  6. Always include these two lines under rules/guidelines:
     - `Be extremely concise. Sacrifice grammar for concision.`
     - `At the end of each plan, list unresolved questions.`

### 3. Extract Architectural Patterns

Identify recurring design patterns, folder structure conventions, or key abstractions in the codebase.

- Extract these into `docs/architectural_patterns.md`.
- Reference [patterns_template.md](references/patterns_template.md) for the structure.
- Provide file:line references for concrete code examples of these patterns.

### 4. Extract Procedural Know-How

Identify step-by-step procedures, deployment configurations, setup guides, or domain-specific instructions that would clutter the main `AGENTS.md` file.

- Extract these into `.agents/skills/<name>/SKILL.md` under the project scope.
- Reference the newly created skills in `AGENTS.md` or `docs/architectural_patterns.md` where relevant.
