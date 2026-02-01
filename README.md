# @kurokeita/add-skill (AI Manager)

CLI to manage and install AI agent skills, agents, and workflows to various platforms.

## Features

- **List Items**: View a list of available AI skills, agents, and workflows.
- **Local status**: Check which items are installed locally.
- **Add Items**: Interactively add skills, agents, and workflows to your supported platforms.
- **Remove Items**: Remove locally installed items from specific platforms.
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
```

### Add Items

Starts an interactive session to select and install items.

```bash
# Add skills
pnpx @kurokeita/add-skill add

# Add agents
pnpx @kurokeita/add-skill add agent

# Add workflows
pnpx @kurokeita/add-skill add workflow
```

### Remove Items

Interactively select items and platforms to remove them from.

```bash
# Remove skills
pnpx @kurokeita/add-skill remove skill

# Remove agents
pnpx @kurokeita/add-skill remove agent
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
| Antigravity | `~/.gemini/antigravity/global_agents` | `~/.gemini/antigravity/global_skills` | `~/.gemini/antigravity/workflows` |
| Gemini CLI | `~/.gemini/agents` | `~/.gemini/skills` | `~/.gemini/workflows` |
| GitHub Copilot | `~/.copilot/agents` | `~/.copilot/skills` | `~/.copilot/prompts` |
| Windsurf | `~/.codeium/windsurf/agents` | `~/.codeium/windsurf/skills` | `~/.codeium/windsurf/workflows` |
<!-- SUPPORTED_AGENTS_END -->

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
