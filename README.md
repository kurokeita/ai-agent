# @kurokeita/add-skill (AI Manager)

CLI to manage and install AI agent skills, agents, and workflows to various platforms.

## Features

- **List Items**: View a list of available AI skills, agents, and workflows.
- **Local status**: Check which items are installed locally.
- **Add Items**: Interactively add skills, agents, and workflows with live search/filtering support.
- **Remove Items**: Remove locally installed items with live search/filtering support.
- **Import**: Import items directly from GitHub URLs.

## Usage

```bash
pnpx @kurokeita/add-skill --help
```

### List Items

List available items in the repository:

```bash
# List skills (default)
pnpx @kurokeita/add-skill list

# List agents
pnpx @kurokeita/add-skill list agent

# List workflows
pnpx @kurokeita/add-skill list workflow
```

List locally installed items:

```bash
pnpx @kurokeita/add-skill list --local
pnpx @kurokeita/add-skill list agent --local

# Pick a scope non-interactively (default: global)
pnpx @kurokeita/add-skill list --local --scope project
pnpx @kurokeita/add-skill list --local --scope both
```

### Add Items

Starts an interactive session to select and install items. Supports live search/filtering as you type.

```bash
# Add skills
pnpx @kurokeita/add-skill add

# Add agents
pnpx @kurokeita/add-skill add agent

# Add workflows
pnpx @kurokeita/add-skill add workflow

# Install at project scope (writes under the current directory's
# `.<platform>/...` paths instead of `~/...`). Project scope is
# refused at $HOME or outside a git work tree.
pnpx @kurokeita/add-skill add --scope project
```

### Remove Items

Interactively select items and platforms to remove them from. Supports live search/filtering as you type.

```bash
# Remove skills
pnpx @kurokeita/add-skill remove skill

# Remove agents
pnpx @kurokeita/add-skill remove agent

# Pick a scope non-interactively
pnpx @kurokeita/add-skill remove skill --scope project
pnpx @kurokeita/add-skill remove skill --scope both
```

### Add Item from GitHub

Install an item directly from a GitHub URL.

```bash
pnpx @kurokeita/add-skill add https://github.com/owner/repo/tree/main/skills/skill-name
```

### Import to Repository (For Maintainers)

Import a skill, agent, or workflow from GitHub into this repository.

```bash
pnpm dev import https://github.com/owner/repo/tree/main/skills/skill-name
```

## Supported Platforms

<!-- SUPPORTED_AGENTS_START -->
| Platform | Agents Path | Skills Path | Workflows Path |
| :--- | :--- | :--- | :--- |
| Antigravity | *Not Supported* | `~/.gemini/antigravity/global_skills` | `~/.gemini/antigravity/global_workflows` |
| Claude Code | `~/.claude/agents` | `~/.claude/skills` | `~/.claude/skills` |
| Codex | `~/.codex/skills` | `~/.codex/skills` | `~/.codex/skills` |
| Gemini CLI | `~/.gemini/agents` | `~/.gemini/skills` | `~/.gemini/commands` |
| GitHub Copilot | `~/.copilot/agents` | `~/.copilot/skills` | `~/.copilot/prompts` |
| Windsurf | *Not Supported* | `~/.codeium/windsurf/skills` | `~/.codeium/windsurf/global_workflows` |
<!-- SUPPORTED_AGENTS_END -->

For Codex, this package installs skills directly and converts agents and workflows into Codex skill packages under `~/.codex/skills`.

### Project-scope paths

When you pick `--scope project`, items are written under the current working directory instead of `~`. The mapping below uses `<project-root>` to mean `process.cwd()` (no git-toplevel relocation: a monorepo subdirectory installs into that subdirectory, not the repo root).

<!-- PROJECT_SCOPE_PATHS_START -->
| Platform | Agents Path | Skills Path | Workflows Path |
| :--- | :--- | :--- | :--- |
| Antigravity | *Not Supported* | `<project-root>/.gemini/antigravity/skills` | `<project-root>/.gemini/antigravity/workflows` |
| Claude Code | `<project-root>/.claude/agents` | `<project-root>/.claude/skills` | `<project-root>/.claude/skills` |
| Codex | `<project-root>/.codex/skills` | `<project-root>/.codex/skills` | `<project-root>/.codex/skills` |
| Gemini CLI | `<project-root>/.gemini/agents` | `<project-root>/.gemini/skills` | `<project-root>/.gemini/commands` |
| GitHub Copilot | `<project-root>/.copilot/agents` | `<project-root>/.copilot/skills` | `<project-root>/.copilot/prompts` |
| Windsurf | *Not Supported* | `<project-root>/.codeium/windsurf/skills` | `<project-root>/.codeium/windsurf/workflows` |
<!-- PROJECT_SCOPE_PATHS_END -->

Project scope is refused when `cwd` equals your home directory or `cwd` is not inside a git work tree. When refused interactively, you can fall back to global scope without losing your already-selected items and platforms.

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
