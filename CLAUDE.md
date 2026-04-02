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
- `src/commands/add.ts` — Core install flow: select type → select items (local or GitHub URL) → select platforms → copy/transform to platform paths.
- `src/commands/import.ts` — Fetches from GitHub into the local repo's `skills/`, `agents/`, or `workflows/` dirs.
- `src/commands/list.ts` — Lists available items (repo) or installed items (local platform dirs).
- `src/commands/remove.ts` — Removes installed items from platform dirs.

### Platform Handler System

Each target platform has a handler implementing `PlatformHandler` (`src/utils/platforms/types.ts`):

- `getTargetFileName(itemName, type)` — Determines output filename (e.g., Gemini workflows become `.toml`).
- `transform(content, type, itemName)` — Transforms content for the platform (e.g., Copilot agents get specific YAML frontmatter with `target: github-copilot`; Codex agents/workflows get wrapped in skill format with `x-ai-agents-type` metadata).

Handlers are registered in `src/utils/platforms/index.ts` via `registerHandler()`. To add a new platform: create a handler class, register it, and add paths to `src/utils/paths.ts`.

### Path Resolution (`src/utils/paths.ts`)

- `Platform` type — Union of supported platform names.
- `PLATFORM_PATHS_SKILLS/AGENTS/WORKFLOWS` — Maps each platform to its install directory (under `~`).
- `TYPE_DIRS` — Maps item types to bundled source dirs relative to `PROJECT_ROOT`.
- `getTargetPaths(type)` — Returns the correct platform→path map for a given type.
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

- **Skills** — Directories containing a `SKILL.md` and optional reference files. Copied as-is to most platforms.
- **Agents** — Single `.md` files with optional YAML frontmatter. Transformed per-platform (Copilot gets specific tools/target, Gemini gets tool lists, Codex wraps as skill).
- **Workflows** — Single `.md` files. Gemini converts to TOML format; Copilot installs to `~/.copilot/prompts`.
