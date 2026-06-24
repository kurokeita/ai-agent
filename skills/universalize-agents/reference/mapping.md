# Platform mapping reference

Reverse map used by the `universalize-agents` skill. Source of truth is
`src/utils/paths.ts` in this repository — keep this file in sync with it.

## Source directories (discover from / symlink to)

`Global` paths are under `$HOME`. `Project` paths are relative to the project
root. A few platforms use a different sub-path between scopes (noted in bold).

### Skills (`.agents/skills`)

| Platform | Global | Project |
|---|---|---|
| Claude Code | `~/.claude/skills` | `.claude/skills` |
| Codex | `~/.codex/skills` | `.codex/skills` |
| GitHub Copilot | `~/.copilot/skills` | `.copilot/skills` |
| Gemini CLI | `~/.gemini/skills` | `.gemini/skills` |
| Windsurf | `~/.codeium/windsurf/skills` | `.codeium/windsurf/skills` |
| Antigravity | `~/.gemini/antigravity/`**`global_skills`** | `.gemini/antigravity/`**`skills`** |

### Agents (`.agents/agents`)

| Platform | Global | Project |
|---|---|---|
| Claude Code | `~/.claude/agents` | `.claude/agents` |
| Codex | `~/.codex/skills` | `.codex/skills` |
| GitHub Copilot | `~/.copilot/agents` | `.copilot/agents` |
| Gemini CLI | `~/.gemini/agents` | `.gemini/agents` |
| Windsurf | — | — |
| Antigravity | — | — |

### Commands / workflows (`.agents/commands`)

| Platform | Global | Project |
|---|---|---|
| Claude Code | `~/.claude/commands` | `.claude/commands` |
| Codex | `~/.codex/skills` | `.codex/skills` |
| GitHub Copilot | `~/.copilot/prompts` | `.copilot/prompts` |
| Gemini CLI | `~/.gemini/commands` | `.gemini/commands` |
| Windsurf | `~/.codeium/windsurf/`**`global_workflows`** | `.codeium/windsurf/`**`workflows`** |
| Antigravity | `~/.gemini/antigravity/`**`global_workflows`** | `.gemini/antigravity/`**`workflows`** |

### Rules (`.agents/rules`)

Standard markdown rule files, discovered from the dirs below and consolidated
into `.agents/rules/`. They are **not** symlinked back — the whole
`.agents/rules/` dir is `@`-imported into `AGENTS.md` (see SKILL.md Phase 4), so
every platform picks them up via the master chain. Codex and Windsurf have no
rules dir to discover from.

| Platform | Global | Project |
|---|---|---|
| Claude Code | `~/.claude/rules` | `.claude/rules` |
| Gemini CLI | `~/.gemini/rules` | `.gemini/rules` |
| Antigravity | `~/.gemini/antigravity/rules` | `.gemini/antigravity/rules` |
| GitHub Copilot | — | `.github/instructions` |
| Codex / Windsurf | — | — |

## Collapsed directories

These targets hold more than one type, so reverse-discovery must read item
frontmatter / the `x-ai-agents-type` metadata to recover the true type:

- `.codex/skills` — skills **and** agents **and** commands.

When symlinking back, use per-item links so these merged directories do not
collide.

## Format normalization

- Workflows are stored under `.agents/commands/` (the universal name); migrate
  any legacy `.agents/workflows/` into it.
- Gemini commands are TOML and convert to markdown skills in
  `.agents/skills/<name>/SKILL.md` (reverse of `convertToGeminiCommandTOML`
  in `src/utils/toml.ts`). See SKILL.md Phase 3.

## Hook-config files (session-start)

Always append into the existing file; back up first; never overwrite.

| Platform | Global | Project | Format |
|---|---|---|---|
| Claude Code | `~/.claude/settings.json` | `.claude/settings.json` | JSON |
| Gemini / Antigravity | `~/.gemini/settings.json` | `.gemini/settings.json` | JSON |
| Codex | `~/.codex/config.toml` | `.codex/config.toml` | TOML |
| Windsurf | — | — | no session-start event; one-time symlink only |
| GitHub Copilot | `~/.copilot/hooks/agent-setup.json` | `.github/hooks/agent-setup.json` | JSON |

## Master-instruction files

| Platform | File |
|---|---|
| Claude Code | `CLAUDE.md` |
| Codex / Antigravity / Windsurf | `AGENTS.md` |
| Gemini CLI | `GEMINI.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |

Canonical consolidated target: root `AGENTS.md` (also copied into
`.agents/rules/`).
