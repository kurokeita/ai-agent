# AGENTS.md

## Purpose & Tech Stack

- **WHAT**: TypeScript CLI manager using Node.js, Commander.js ([bin/cli.ts:L16](bin/cli.ts#L16)), fs-extra, and Clack prompts. Bundled with Esbuild, tested with Vitest, and formatted/linted via Biome.
- **WHY**: A command-line utility to install, list, remove, and import agentic AI skills, assistant configurations, and workflows centrally across multiple environments (Antigravity, Claude Code, Codex, Gemini CLI, GitHub Copilot, Windsurf) by organizing local directories and symlinking.

## Commands

```bash
pnpm dev             # Run interactive local CLI in development mode (using tsx)
pnpm build           # Bundle CLI and copy asset files (skills, agents, workflows) to dist/
pnpm test            # Run unit tests using Vitest
pnpm test:coverage   # Run unit tests with code coverage report
pnpm lint            # Check files with Biome formatter/linter and Markdownlint
pnpm format          # Auto-format codebase and fix markdown files
pnpm release         # Trigger semantic-release pipeline (production publishing)
```

## Documentation Index

- [README.md](README.md) — Main user guide including usage commands, directory mapping, and installation details.
- [docs/architectural_patterns.md](docs/architectural_patterns.md) — Document detail of recurring architectural and design patterns.
- [.agents/skills/git-commit/SKILL.md](.agents/skills/git-commit/SKILL.md) — Protocol and guidelines for writing Git commits.
- [.agents/skills/pr/SKILL.md](.agents/skills/pr/SKILL.md) — Instructions for creating a Pull Request following repository conventions.

## Critical Workflows

### 1. Verification & Testing

1. Format and check syntax errors: `pnpm format` followed by `pnpm lint`.
2. Run entire test suite locally: `pnpm test`. All code changes must keep test suites green.
3. Validate coverage thresholds (90% minimums): `pnpm test:coverage`.

### 2. Building & Bundling

1. Ensure TypeScript compilation passes: `tsc --noEmit`.
2. Bundle the CLI application to single ESM output: `esbuild bin/cli.ts --bundle --platform=node --format=esm --outfile=dist/bin/cli.js --packages=external`.
3. Copy static asset files (the database of skills, agents, workflows) to the build distribution directory: `tsx scripts/copy-assets.ts`.
4. Note: The complete build flow is automated in a single script: `pnpm build`.

### 3. Publishing & Releasing

1. Ensure build succeeds and tests are green: `pnpm prepublishOnly` runs `pnpm build`.
2. Generate changelogs and publish version to npm repository: `pnpm release` (triggered by CI pipeline on the `main` branch).

## Guidelines

- Be extremely concise. Sacrifice grammar for concision.
- At the end of each plan, list unresolved questions.
