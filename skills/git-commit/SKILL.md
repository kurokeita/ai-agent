---
name: git-commit
description: This skill should be used when the user asks to "create a branch", "commit changes", "manage branches", or "follow conventional commits". Provides guidelines for version control workflows and commit message formatting.
version: 1.0.0
---

# Git Commit

Guide for managing version control workflows, including branching strategies and commit message formatting following the Conventional Commits specification.

## When to Use This Skill

- Creating new feature, bugfix, or maintenance branches
- Formatting commit messages to follow project standards
- Managing branch lifecycle and organization
- Ensuring consistency across the repository's history

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

## Conventional Commits

Format commit messages according to the [Conventional Commits](https://www.conventionalcommits.org/) specification to enable automated changelog generation and easier history browsing.

### Structure

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- `ci`: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
- `chore`: Other changes that don't modify src or test files
- `revert`: Reverts a previous commit

### Guidelines

- **Description**: Use the imperative, present tense (e.g., "add", not "added" or "adds").
- **Case**: The description should be in lower-case or sentence-case.
- **Scope**: Use a scope to provide additional contextual information (e.g., `feat(auth): add login validation`).
- **Body**: Use the body to explain the "what" and "why" of the change, not the "how".
- **Footer**: Use the footer to reference issues (e.g., `Closes #123`) or breaking changes.

## Additional Resources

### Reference Files

For detailed patterns and advanced git workflows, consult:

- **`references/conventional-commits.md`** - Detailed Conventional Commits specification.
- **`references/branching-workflows.md`** - Advanced branching and merging strategies.

### Example Files

Working examples in `examples/`:

- **`commit-messages.txt`** - Examples of well-formatted commit messages.
