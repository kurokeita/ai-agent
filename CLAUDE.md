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

<!-- gitnexus:start -->
## GitNexus — Code Intelligence

This project is indexed by GitNexus as **ai-agent** (2529 symbols, 3006 relationships, 44 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

### Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

### Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

### Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ai-agent/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ai-agent/clusters` | All functional areas |
| `gitnexus://repo/ai-agent/processes` | All execution flows |
| `gitnexus://repo/ai-agent/process/{name}` | Step-by-step execution trace |

### CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
