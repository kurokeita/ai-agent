# Hook templates

Session-start hook snippets that the `universalize-agents` skill merges into
each platform's config file (see `../mapping.md` for file locations).

## Verification status

| Platform | Template | Status |
|---|---|---|
| Claude Code | `claude-code.json` | Verified |
| Gemini / Antigravity | `gemini.json` | Verified |
| Codex | `codex.toml` | Verified |
| GitHub Copilot | `copilot.json` | Verified |
| Windsurf | — | No session-start hook — one-time symlink only |

Windsurf (Cascade) hooks are action-scoped only (`pre_write_code`,
`post_setup_worktree`, etc.) with no session-start event, so no recurring hook
is installed. Windsurf still gets a one-time symlink during the setup run (its
dirs stay in the link map); re-run the setup script manually to pick up later
changes to the shared `.agents/`.

## Merge rules (all platforms)

- Append, never overwrite. Parse the file, inject the hook only if an
  equivalent entry is absent, then write back.
- Back up the file to `<file>.bak` before the first modification.
- The hook command is the absolute path to the OS-appropriate setup script
  (`agent-setup.sh` on macOS/Linux, `agent-setup.ps1` on Windows). Copilot
  uses the `bash`/`powershell` fields; Gemini and Codex use a `command`
  string grouped under a `matcher`.
