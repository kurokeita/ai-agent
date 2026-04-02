---
name: git-branch
description: This skill should be used when the user asks to "create a branch", "branch naming", "branch strategy", or "follow conventional branch". Provides guidelines for version control branching strategies and rules.
version: 1.0.0
---

# Git Branch

Guide for managing version control branching strategies following the Conventional Branch specification.

## When to Use This Skill

- Creating new feature, bugfix, or maintenance branches
- Ensuring branch names follow project standards
- Managing branch lifecycle and organization
- Integrating issue tracker IDs into branch names

## Branching Strategy

Follow the [Conventional Branch](https://conventional-branch.github.io/) specification for consistent and descriptive branch naming.

### Structure

The branch structure follows a categorized format:
`<type>/<description>`

### Types (`<type>`)

- `main`: The primary development branch (e.g., `main`, `master`, or `develop`).
- `feat/`: For new features (e.g., `feat/add-login-page`).
- `fix/`: For bug fixes (e.g., `fix/header-bug`).
- `hotfix/`: For urgent production fixes (e.g., `hotfix/security-patch`).
- `release/`: For preparing a new release (e.g., `release/v1.2.0`).
- `chore/`: For non-code tasks like dependencies or documentation updates (e.g., `chore/update-dependencies`).

### Naming Rules

- **Character Set**: Use lowercase alphanumerics (`a-z`, `0-9`), hyphens (`-`), and dots (`.`).
- **Separators**: Use hyphens to separate words in the description. Dots are permitted in `release/` branches for versioning.
- **Restrictions**:
  - Avoid special characters, underscores, or spaces.
  - No consecutive hyphens or dots (e.g., avoid `new--login`).
  - No leading or trailing hyphens/dots in the description.
- **Conciseness**: Keep names descriptive yet brief.
- **Ticket Integration**: Include project management ticket numbers if applicable (e.g., `feat/issue-123-new-login`).

### Workflow

1. Start from the main integration branch.
2. Ensure the local branch is up-to-date: `git pull origin main`.
3. Create the new branch: `git checkout -b <type>/<description>`.

## Additional Resources

### Reference Files

For detailed patterns and advanced git workflows, consult:

- **`references/branching-workflows.md`** - Advanced branching and merging strategies.
