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

#### Commit Message Examples

**Complex feature** — Summary paragraph + "Key changes:" section:

```
feat(scope): add feature description (#N)

One or two sentences describing what changed and why it matters. Focus on
the user-facing impact or developer experience improvement.

Key changes:
- Updated dependency X to version Y for improved performance.
- Refactored module A to support the new behavior.
- Added tests covering edge cases in the new logic.
- Updated documentation to reflect the new capability.
```

**Multi-part refactor** — Summary paragraph + plain bullets:

```
refactor(scope): describe the refactoring goal

Brief explanation of the refactoring goal and what it improves
(maintainability, performance, clarity, etc.).

- Split monolithic module X into focused submodules A, B, and C.
- Module A: handles responsibility 1 with clear public API.
- Module B: handles responsibility 2, extracted for reuse.
- Ensured all modules follow progressive disclosure principles.
```

**Architecture change** — Bold-prefixed bullets for scannability:

```
feat: describe the architectural change (#N)

- **Component A**: Implemented the new subsystem for handling X.
- **Component B**: Added transformation logic between formats Y and Z.
- **Unified Entry**: Refactored the main entry point to support both
  interactive and programmatic usage.
- **Test Coverage**: Achieved and verified full coverage for all modules.
```

**Simple change** — Minimal bullets, no summary paragraph:

```
feat(scope): add or update something

- Add configuration file with default settings
- Add reference documentation for the new feature
- Add example usage in the project README
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
