# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

`@kurokeita/add-skill` is a CLI tool (`ai-agent`) that installs AI agent skills, agents, and workflows from a bundled repository to various AI coding platforms (GitHub Copilot, Windsurf, Gemini CLI, Antigravity, Codex). It can also fetch items from GitHub URLs.

## Commands

```bash
pnpm run dev              # Run CLI in dev mode (tsx bin/cli.ts)
pnpm run build            # Type-check + esbuild bundle + copy assets to dist/
pnpm run test             # Run all tests (vitest)
pnpm run test -- --watch  # Watch mode
pnpm run test -- src/utils/__tests__/github.test.ts  # Single test file
pnpm run lint             # Lint TS (biome) + MD (markdownlint)
pnpm run format           # Auto-fix lint issues
```

## Architecture

### Entry Point & Commands

- `bin/cli.ts` — CLI entry using Commander. No-arg launches interactive mode; subcommands: `add`, `list`, `import`, `remove`.
- `src/commands/add.ts` — Core install flow: select type → select items (local or GitHub URL) → choose scope → copy into the canonical `.agents/` dir → optionally wire per-platform session-start hooks.
- `src/commands/import.ts` — Fetches from GitHub into the local repo's `skills/`, `agents/`, or `workflows/` dirs.
- `src/commands/list.ts` — Lists available items (repo) or installed items under the canonical `.agents/` dir.
- `src/commands/remove.ts` — Removes installed entries from `.agents/` and prunes any dangling platform symlinks pointing at them.

### Canonical `.agents/` Model

Items install into a single canonical directory rather than per-platform paths:

- **Global scope** → `~/.agents/{skills,agents,commands}`
- **Project scope** → `<root>/.agents/{skills,agents,commands}`

`getAgentsBase(scope, root)` resolves the base; `TYPE_SUBDIRS` maps each item type to its subdir (`skill→skills`, `agent→agents`, `workflow→commands`).

### Hook Wiring (`src/utils/agent-setup.ts`)

After install, `add` can wire each platform to the canonical dir:

- Generates a session-start hook script (`agent-setup.sh`/`.ps1`) under `.agents/hooks/`, parameterized with a link map of `subdir|platform-dir` destinations.
- Merges a `SessionStart` hook entry into each platform's config (Claude Code/Gemini/Copilot JSON, Codex TOML) so the script runs at session start and symlinks `.agents/` entries back into each platform's directories.
- `PLATFORM_PATHS_SKILLS/AGENTS/WORKFLOWS` (and the `getProjectPlatformPaths*` project variants) supply the per-platform destination dirs used to build the link map.

### Path Resolution (`src/utils/paths.ts`)

- `Platform` type — Union of supported platform names.
- `PLATFORM_PATHS_SKILLS/AGENTS/WORKFLOWS` — Per-platform install dirs (under `~`); used as symlink destinations by the hook scripts.
- `getProjectPlatformPaths{Skills,Agents,Workflows}(root)` — Project-relative variants of the above.
- `getAgentsBase(scope, root)` — Resolves the canonical `.agents` base for a scope.
- `TYPE_DIRS` — Maps item types to bundled source dirs relative to `PROJECT_ROOT`.
- `TYPE_SUBDIRS` — Maps item types to canonical `.agents` subdirs.
- `resolveProjectRoot()` — Handles both dev (source) and installed (dist/) layouts by checking for bundled asset dirs.

### GitHub Fetching (`src/utils/github.ts`)

`fetchSkillFromGitHub(url)` — Parses GitHub URLs (`/tree/` or `/blob/`), recursively downloads via GitHub Contents API to a temp dir. Returns `{ tempDir, skillName, isFile }`.

## Code Style

- **Formatter**: Biome with tabs, double quotes, no semicolons (ASI).
- **Path alias**: `@/` maps to `src/` (configured in both tsconfig.json and vitest.config.ts).
- **Module system**: ESM (`"type": "module"` in package.json).
- **Test coverage threshold**: 90% across statements, branches, functions, and lines.
- **Interactive UI**: Uses `@clack/prompts` for all user interaction (spinners, selects, confirms).

## Content Types

All types install into the canonical `.agents/` dir as-is; platforms consume them via the symlinks created by the session-start hook.

- **Skills** — Directories containing a `SKILL.md` and optional reference files. Install into `.agents/skills`.
- **Agents** — Single `.md` files with optional YAML frontmatter. Install into `.agents/agents`.
- **Workflows** — Single `.md` files. Install into `.agents/commands`.
