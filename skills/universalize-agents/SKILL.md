---
name: universalize-agents
description: Use when the user wants to consolidate or "universalize" their AI agent setup across platforms (Claude Code, Codex, Windsurf, GitHub Copilot, Gemini CLI, Antigravity). Discovers each platform's installed skills/agents/commands and master instructions, copies them into a single `.agents/` directory, migrates master instructions into a canonical `AGENTS.md`, and installs a per-platform session-start hook that symlinks `.agents/` back into each platform's directories.
version: 0.1.0
---

# Universalize Agents

Consolidate a multi-platform AI agent setup into one source of truth
(`.agents/` + `AGENTS.md`) and wire every platform to re-materialize it via
symlinks on each session start.

This skill is the first step of a larger "universalize agent setup" feature.
It performs discovery, consolidation, and hook installation. It does **not**
modify this repository's `src/` or CLI.

## Canonical references

Read these before acting — they are the source of truth and must not drift
from the codebase:

- `reference/mapping.md` — reverse map of every platform's
  skills/agents/commands directories (derived from `src/utils/paths.ts`),
  the per-platform hook-config file locations, and the master-instruction
  file names.
- `scripts/agent-setup.sh` (macOS/Linux) and `scripts/agent-setup.ps1`
  (Windows) — the idempotent symlink templates that get installed.
- `reference/hook-templates/` — per-platform session-start hook snippets.

## When to Use

Invoke when the user asks to "universalize", "consolidate", "unify", or
"centralize" their agent setup, skills, commands, or instructions across more
than one AI coding platform.

## Workflow

Follow these phases in order. Stop and ask whenever a decision is the user's
to make.

### Phase 1 — Choose scope

Ask the user: **universalize the setup for the current project, or globally?**

- `project` → `.agents/` lives at the project root; platform targets are the
  project-relative directories in `reference/mapping.md`.
- `global` → `.agents/` lives at `$HOME/.agents`; platform targets are the
  `~/...` directories in `reference/mapping.md`.

Record the chosen scope and the resolved base directory (`BASE`). Everything
downstream uses `BASE`.

### Phase 2 — Discover existing setups

For each of the six platforms, check whether its directories exist under
`BASE` (per `reference/mapping.md`). Treat a platform as "in use" if any of
its skills/agents/commands dirs or its master-instruction file exists.

For each in-use platform, enumerate items in its `skills`, `agents`, and
`workflows` source dirs. Some platforms collapse multiple types into one
directory (Codex puts skills + agents + workflows in `.codex/skills`; Claude
Code puts workflows in `.claude/skills`). Disambiguate an item's real type by
reading its frontmatter / the `x-ai-agents-type` metadata this toolchain
writes when wrapping items — never by directory alone.

Report a discovery summary (platforms in use, item counts per type) before
continuing.

### Phase 3 — Build `.agents/`

Create the unified layout under `BASE`:

```text
.agents/
  skills/    agents/    commands/    rules/    hooks/
```

Copy discovered items into `.agents/{skills,agents,commands}`. When the
same-named item is found on more than one platform, copy it once: prefer the
first platform discovered and warn about the collision rather than silently
overwriting. Never wipe an existing `.agents/` — merge into it.

#### Format normalization

The unified store is markdown-only. Normalize as you copy:

- **Workflows → commands.** Treat every platform's "workflow" items as the
  universal `commands` type and place them in `.agents/commands/`. If a prior
  run left a `.agents/workflows/` directory, move its contents into
  `.agents/commands/` and remove the now-empty `workflows/` dir.
- **Gemini commands → skills.** Gemini stores commands as TOML
  (`.gemini/commands/*.toml`), which cannot be symlinked back as markdown.
  Convert each Gemini `*.toml` into a skill: parse its `description` and
  `prompt = """..."""` fields, then write `.agents/skills/<name>/SKILL.md`
  with the prompt as the body and this frontmatter:

  ```markdown
  ---
  name: <toml file name without extension>
  description: <value of the TOML `description` field>
  ---

  <contents of the TOML `prompt` field>
  ```

  This is the reverse of `convertToGeminiCommandTOML` in
  `src/utils/toml.ts`. Gemini workflows therefore land in `.agents/skills/`,
  not `.agents/commands/`.

### Phase 4 — Migrate master instructions

Detect every master-instruction file present in scope:

| Platform | File |
|---|---|
| Claude Code | `CLAUDE.md` |
| Codex / Antigravity / Windsurf | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |

The canonical target is root `AGENTS.md` (already the native master file for
Codex, Antigravity, and Windsurf).

- **None found** → create a minimal `AGENTS.md`.
- **Exactly one found** → use it as `AGENTS.md` directly, no prompt.
- **Two or more distinct files found** → STOP and ask the user how to
  consolidate:
  1. **Keep one** — show each detected file with a short preview / line
     count; the user picks which becomes `AGENTS.md`.
  2. **Merge all + trim** — concatenate every source, then de-duplicate
     overlapping instructions into one coherent `AGENTS.md` (semantic
     de-duplication, preserving every unique directive). Surface any
     conflicting directives to the user instead of dropping them silently.

After producing `AGENTS.md`, copy it into `.agents/rules/`. Then **replace the
entire contents** of each non-`AGENTS.md` master file with a single import
line — its original content now lives in `AGENTS.md`:

```text
@AGENTS.md
```

Always create `AGENTS.md` (with the migrated content) before overwriting any
master file, so nothing is lost. Platforms that natively read `AGENTS.md`
(Codex, Antigravity, Windsurf) need no such file.

### Phase 5 — Install and run the setup script

Pick the script for the host OS — `scripts/agent-setup.sh` on macOS/Linux,
`scripts/agent-setup.ps1` on Windows — copy it into `BASE/.agents/hooks/`
(keeping its extension), make it executable, and fill its two placeholders:

- `__AGENTS_DIR__` → path to `BASE/.agents`: **relative** (`.agents`) for
  project scope, **absolute** for global scope.
- `__LINK_MAP__` → one `SRC_SUBDIR|DEST_DIR` line per (in-use platform × type),
  using the scope-correct destination dirs from `reference/mapping.md`.
  `SRC_SUBDIR` is `skills`, `agents`, or `commands`. Use **relative** dest
  dirs (e.g. `.claude/skills`) for project scope and **absolute** dirs for
  global scope. The script detects the mode from `__AGENTS_DIR__` and emits
  relative symlinks for project scope, absolute for global.

The script symlinks each item individually (not whole directories) so that
collapsed targets like `.codex/skills` can receive skills + agents + commands
merged together without conflict. It is idempotent and refuses to clobber a
real (non-symlink) path.

In **project scope** the script keeps the generated symlinks out of git by
writing a single `.gitignore` per platform at its base dir (the parent of the
target dirs, e.g. `.claude/.gitignore`) that lists each symlink subdir
(`skills/`, `commands/`, …). Only the canonical `.agents/` content (which you
commit) is version-controlled. Global scope skips this (it is not inside a
repo).

Once `.agents/` holds every item and the script is installed, **delete the
original item files/directories at each platform source dir**. The canonical
copy now lives in `.agents/`, so the originals are redundant — and because the
symlink step refuses to overwrite a real path, it cannot link until the
original is gone. Then run the setup script once to create the symlinks; every
later session-start run re-applies them idempotently.

### Phase 6 — Install session-start hooks

For each in-use platform, register a session-start hook that runs the
installed setup script in `BASE/.agents/hooks/` (`agent-setup.sh` on
macOS/Linux, `agent-setup.ps1` on Windows), writing to the config file in
`reference/mapping.md`:

| Platform | Project file | Global file | Format |
|---|---|---|---|
| Claude Code | `.claude/settings.json` | `~/.claude/settings.json` | JSON |
| Gemini / Antigravity | `.gemini/settings.json` | `~/.gemini/settings.json` | JSON |
| Codex | `.codex/config.toml` | `~/.codex/config.toml` | TOML |
| Windsurf | — | — | no session-start hook (skip) |
| GitHub Copilot | `.github/hooks/agent-setup.json` | `~/.copilot/hooks/agent-setup.json` | JSON |

Rules for every write:

- **Append, never overwrite.** Parse the existing file, inject the hook entry
  only if an equivalent one is absent, then write back. Preserve all other
  keys and formatting as much as the format allows.
- **Path style follows scope.** The hook command points at the setup script:
  use a **relative** path (`.agents/hooks/agent-setup.sh`) for project scope
  and an **absolute** path for global scope — matching how `__AGENTS_DIR__`
  was filled.
- Back up the file (`<file>.bak`) before the first modification.
- Use the verified template for each platform in `reference/hook-templates/`
  (`claude-code.json`, `gemini.json`, `codex.toml`, `copilot.json`).
  **Windsurf has no session-start hook**, so it gets no recurring hook. Keep
  its dirs in the Phase 5 `__LINK_MAP__` so the one-time setup run symlinks
  them, but tell the user the shared `.agents/` will not auto-refresh on
  Windsurf — they re-run the setup script manually to pick up later changes.
  Codex prompts for a trust review of project hooks on first use.

### Phase 7 — Report

Summarize: scope, platforms processed, items consolidated per type, how
master instructions were resolved, which hooks were installed (and which were
skipped/unverified), and any collisions or backups created.

## Constraints

- Append-only for existing config (settings/hook) files; back up first.
  Master instruction files are the exception: replace their contents with the
  `@AGENTS.md` import once the content is migrated into `AGENTS.md`.
- Per-item symlinks, never whole-directory, never clobber real paths.
- Do not fabricate hook schemas; verify unverified platforms at runtime.
- Do not modify this repo's `src/`, CLI, or `paths.ts`.
