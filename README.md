# @kurokeita/add-skill (AI Manager)

[![build](https://img.shields.io/github/actions/workflow/status/kurokeita/ai-agent/release.yml?branch=main)](https://github.com/kurokeita/ai-agent/actions/workflows/release.yml)
[![npm version](https://img.shields.io/npm/v/@kurokeita/add-skill)](https://www.npmjs.com/package/@kurokeita/add-skill)
[![npm downloads](https://img.shields.io/npm/dt/@kurokeita/add-skill)](https://www.npmjs.com/package/@kurokeita/add-skill)
[![license](https://img.shields.io/npm/l/@kurokeita/add-skill)](https://github.com/kurokeita/ai-agent/blob/main/LICENSE.md)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![code style: biome](https://img.shields.io/badge/code_style-biome-60a5fa.svg)](https://biomejs.dev)

CLI to manage and install AI agent skills to various platforms.

## Features

- **List Skills**: View a list of available skills.
- **Local status**: Check which skills are installed locally.
- **Add Skills**: Interactively add skills with live search/filtering support.
- **Remove Skills**: Remove locally installed skills with live search/filtering support.
- **Import**: Import skills directly from GitHub URLs.

## Usage

```bash
pnpx @kurokeita/add-skill --help
```

### List Skills

List available skills in the repository:

```bash
pnpx @kurokeita/add-skill list skill
```

List locally installed skills:

```bash
pnpx @kurokeita/add-skill list skill --local

# Pick a scope non-interactively (default: global)
pnpx @kurokeita/add-skill list --local --scope project
pnpx @kurokeita/add-skill list --local --scope both
```

### Add Skills

Starts an interactive session to select and install skills. Supports live search/filtering as you type.

```bash
pnpx @kurokeita/add-skill add

# Install at project scope (writes under the current directory's
# `.<platform>/...` paths instead of `~/...`). Project scope is
# refused at $HOME or outside a git work tree.
pnpx @kurokeita/add-skill add --scope project
```

### Remove Skills

Interactively select installed skills to remove. Supports live search/filtering as you type.

```bash
pnpx @kurokeita/add-skill remove skill

# Pick a scope non-interactively
pnpx @kurokeita/add-skill remove skill --scope project
pnpx @kurokeita/add-skill remove skill --scope both
```

### Add a Skill from GitHub

Install a skill directly from a GitHub URL.

```bash
pnpx @kurokeita/add-skill add skill https://github.com/owner/repo/tree/main/skills/skill-name
```

### Import to Repository (For Maintainers)

Import a skill from GitHub into this repository.

```bash
pnpm dev import skill https://github.com/owner/repo/tree/main/skills/skill-name
```

## How Installs Work

`add` copies every skill into a single canonical directory:

- **Global scope** → `~/.agents/skills`
- **Project scope** → `<project-root>/.agents/skills`

After copying, `add` can optionally wire each platform you select: it installs a session-start hook (under `.agents/hooks/`) and registers it in that platform's config. On each new session the hook symlinks the canonical `.agents/skills` entries back into the platform's own skills directory, so every tool sees the same set of skills from one source of truth.

A skill can also ship Claude Code hooks in a `hooks/` dir. `hooks/hooks.json` holds the `hooks` object of `.claude/settings.json`, and `${HOOKS_DIR}` in its commands resolves to `.claude/hooks`. When `add` installs a skill that has this manifest, it offers to copy the other files in `hooks/` to `.claude/hooks/` and merge the entries into `.claude/settings.json` (global or project, matching the install scope). `git-commit` uses this to install its `commit-gate.py` hook.

`list` and `remove` operate on the canonical `.agents/skills` dir. Removing a skill also prunes any platform symlink left pointing at it.

## Supported Platforms

The tables below show where each platform loads skills from. These are the symlink destinations the session-start hook creates.

| Platform | Skills Path |
| :--- | :--- |
| Antigravity | `~/.gemini/antigravity/global_skills` |
| Claude Code | `~/.claude/skills` |
| Codex | `~/.codex/skills` |
| Gemini CLI | `~/.gemini/skills` |
| GitHub Copilot | `~/.copilot/skills` |
| Windsurf | `~/.codeium/windsurf/skills` |

### Project-scope paths

When you pick `--scope project`, the canonical `.agents/` dir and the symlink destinations live under the current working directory instead of `~`. The mapping below uses `<project-root>` to mean `process.cwd()` (no git-toplevel relocation: a monorepo subdirectory installs into that subdirectory, not the repo root).

| Platform | Skills Path |
| :--- | :--- |
| Antigravity | `<project-root>/.gemini/antigravity/skills` |
| Claude Code | `<project-root>/.claude/skills` |
| Codex | `<project-root>/.codex/skills` |
| Gemini CLI | `<project-root>/.gemini/skills` |
| GitHub Copilot | `<project-root>/.copilot/skills` |
| Windsurf | `<project-root>/.codeium/windsurf/skills` |

Project scope is refused when `cwd` equals your home directory or `cwd` is not inside a git work tree. When refused interactively, you can fall back to global scope without losing your already-selected skills and platforms.

## Development

1. **Clone the repository:**

    ```bash
    git clone https://github.com/kurokeita/ai-agent.git
    cd ai-agent
    ```

2. **Install dependencies:**

    ```bash
    pnpm install
    ```

3. **Run in development mode:**

    ```bash
    pnpm dev
    ```

4. **Lint and Format:**

    ```bash
    pnpm lint
    pnpm format
    ```

5. **Build:**

    ```bash
    pnpm build
    ```

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE.md).
