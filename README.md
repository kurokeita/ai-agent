# @kurokeita/add-skill

CLI to install AI agent skills to various platforms.

## Features

- **List Skills**: View a list of available AI skills.
- **Add Skills**: Interactively add skills to your supported platforms.

## Usage

```bash
pnpx @kurokeita/add-skill --help
```

### List Available Skills

```bash
pnpx @kurokeita/add-skill list
```

### Add Skills

Starts an interactive session to select and install skills.

```bash
pnpx @kurokeita/add-skill add
```

### Add Skill from GitHub

Install a skill directly from a GitHub URL.

```bash
pnpx @kurokeita/add-skill add https://github.com/owner/repo/tree/main/skills/skill-name
```

### Add new Skill to this repository (For Maintainers)

- Either use the import tool to import a skill from GitHub into the repository's `skills` directory or adding a skill yourself in the `skills` directory.

```bash
pnpm dev import https://github.com/owner/repo/tree/main/skills/skill-name
```

- Create a PR to merge the skill into the repository.

## Supported Agents

<!-- SUPPORTED_AGENTS_START -->
| Agent | Global Path |
| :--- | :--- |
| Antigravity | `~/.gemini/antigravity/global_skills` |
| Gemini CLI | `~/.gemini/skills` |
| GitHub Copilot | `~/.copilot/skills` |
| Windsurf | `~/.codeium/windsurf/skills` |
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
