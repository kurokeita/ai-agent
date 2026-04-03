---
name: git-pr
description: This skill should be used when the user asks to "create a pull request", "open a PR", "prepare a pull request", or "review a PR description". Provides guidelines for effective pull request management and industry-standard templates.
version: 1.0.0
---

# Git Pull Request

Guide for creating and managing clear and informative pull requests to facilitate effective code review and collaboration.

## When to Use This Skill

- Preparing and creating pull requests
- Writing pull request descriptions
- Ensuring pull requests meet quality standards before submission
- Managing the PR lifecycle and reviewer feedback

## Pull Request Management

Create clear and informative pull requests to ensure that reviewers can understand the impact and context of your changes.

### PR Creation Process

1. **Push your branch**: `git push origin <branch-name>`.
2. **Open the PR**: Use the GitHub CLI or web interface.
3. **Title**: Use the Conventional Commits format for the title (e.g., `feat(ui): add dashboard widgets`).
4. **Description**: Use a template (if available) to describe:
    - What changes were made.
    - Why they were made.
    - How they were tested.
    - Any breaking changes or new dependencies.

### Merge Strategy

This repo uses **squash merge** for all PRs. The resulting commit on `main` follows a strict format:

- **Commit title:** `<conventional-commit-title> (#<pr-number>)`
  - Example: `feat(cli): implement live search filtering for item selection (#24)`
- **Extended description:** A concise summary paragraph followed by bullet-point details of key changes.
  - The PR description body becomes the commit message body during squash merge.
  - Write the description so it reads well as a git log entry — focus on **what** changed and **why**, not **how**.
  - Use bullet points for listing specific file-level or feature-level changes.
  - Avoid checklist boilerplate in the final description; it clutters the git history.

#### Commit Message Examples (from project history)

**Complex feature** — Summary paragraph + "Key changes:" section:

```
feat(cli): implement live search filtering for item selection (#24)

Upgrade @clack/prompts to v1.2.0 and switch to the new autocompleteMultiselect
component in the add and remove commands. This enables real-time filtering of
available skills, agents, and workflows as the user types, significantly
improving the selection experience for large lists.

Key changes:
- Updated package.json and pnpm-lock.yaml to @clack/prompts@1.2.0.
- Replaced multiselect with autocompleteMultiselect in src/commands/add.ts
  and src/commands/remove.ts.
- Migrated spinner usage to the new semantic API (s.error()) for better
  failure state management in add.ts and import.ts.
- Updated mocks and assertions in all 22 test files to support the new
  component and spinner methods, maintaining 100% test pass rate.
- Documented the live search/filtering capability in README.md.
```

**Multi-part refactor** — Summary paragraph + plain bullets:

```
feat(skills): modularize git conventions and add git-clean skill

Refines and modularizes the Git-related AI agent skills to improve task targeting and maintain repository hygiene.

- Split the monolithic `git-convention` skill into three focused skills: `git-branch`, `git-commit`, and `git-pr`.
- `git-branch`: Implemented the Conventional Branch specification using shorter prefixes (`feat/`, `fix/`).
- `git-commit`: Refined to focus strictly on the Conventional Commits specification for message formatting.
- `git-pr`: Added an industry-standard PR template and best practices based on patterns from React, VS Code, and Kubernetes.
- `git-clean`: Introduced a new skill integrating the `@kurokeita/git-clean-up` tool.
```

**Architecture change** — Bold-prefixed bullets for scannability:

```
feat: modular platform handlers and unified interactive entry point (#17)

- **Modular Platform Handlers**: Implemented a registry-based system for platform handlers (`Copilot`, `Gemini`, `Windsurf`, `Antigravity`) to manage specific file naming and content transformations.
- **Agent Transformations**: Added logic to automatically transform `.md` agent files into platform-specific formats (e.g., `.prompt.md` for Copilot, `.toml` for Gemini).
- **Unified Interactive Entry**: Refactored the main CLI entry point to a single interactive loop while maintaining support for direct command-line arguments.
- **100% Test Coverage**: Achieved and verified 100% code coverage for all command modules and utility functions.
```

**Simple change** — Minimal bullets, no summary paragraph:

```
feat(skills): add git-convention skill

- Add SKILL.md with guidelines for branching, commits, and PRs
- Add industry-standard pull request template
- Add references for Conventional Commits, branching workflows, and PR best practices
- Add example commit messages and PR description template
```

### Best Practices

- **Keep it focused**: One PR per logical change. Avoid "mega-PRs".
- **Self-review**: Review your own changes before asking others.
- **Link issues**: Use keywords like `Fixes #123` or `Closes #123` in the description.
- **Update regularly**: Rebase or merge from the main branch if the PR becomes stale.

## Additional Resources

### Reference Files

For detailed patterns and industry-standard analysis, consult:

- **`references/pr-best-practices.md`** - Analysis of PR patterns from top repositories.

### Example Files

Working examples in `examples/`:

- **`pr-description-template.md`** - A standard, industry-standard PR description template.
