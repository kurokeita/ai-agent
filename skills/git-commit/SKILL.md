---
name: git-commit
description: Use BEFORE running any write-side git or gh command (git commit, git commit --amend, git push --force / --tags, git reset --hard, git rebase, gh pr create, gh pr merge), and whenever the user asks to commit changes, write a commit message, or follow conventional commits. Provides the hard pre-commit protocol (stop, summarize, propose, ask, wait) plus the Conventional Commits format used for the proposed message.
version: 2.0.0
---

# Git Commit

This skill enforces the pre-commit protocol AND specifies the commit-message format. Both are mandatory before any gated git/gh write operation runs.

## When to Use

Invoke this skill BEFORE calling Bash for any of:

- `git commit` (any form, including `-m`, `-am`, no-args, heredoc, chained via `&&`/`;`)
- `git commit --amend` (any form)
- `git push --force` / `git push -f` / `git push --force-with-lease`
- `git push --tags`
- `git reset --hard`
- `git rebase` (any form, interactive or non-interactive)
- `gh pr create`
- `gh pr merge`

Also invoke when the user asks to commit changes, write a commit message, or follow conventional commits.

The `permissions.ask` rule in `~/.claude/settings.json` will surface a permission prompt for these commands regardless. This skill ensures the prompt arrives with a proper proposal already presented to the user.

## Pre-Commit Protocol (HARD RULE)

Every gated command, every time. No exceptions for "tiny" or "obvious" changes. Each commit gets its own gate even within the same session. Plan approval, prior "go ahead" signals, and approvals of earlier commits do NOT carry over.

### Step 1 — STOP

Do not retry the command yet. The first attempt is your trigger, not your green light.

### Step 2 — Emit a detailed technical summary

```bash
### Technical summary
- Scope: <files added/modified/deleted, one-line purpose each>
- Behavior change: <user-visible / API-visible effect, or "none" for pure refactors>
- Architecture/contract impact: <new exports, removed symbols, changed signatures, new dependencies, or "none">
- Tests: <what was added/updated, what was run, the result>
- Risk notes: <edge cases, deferred follow-ups, impact-analysis severity>
```

Fill every bullet. "None" is a valid answer; an omitted bullet is not.

### Step 3 — Propose a commit message

Format per the Conventional Commits section below. No `Co-Authored-By: Claude` trailer. Imperative present tense, no trailing period in the subject. When a body is included, it explains the why.

**Match the message size to the change.** For small commits — single file, trivial scope, narrow type change, doc tweak, small revert, one-line config flip, renamed prop — propose a title-only message. No body, no bullets. The subject alone conveys intent and a body adds friction without value.

```bash
### Proposed commit message
<type>(<scope>): <imperative subject>
```

Reserve the full proposal format (body + bullets) for commits that touch multiple files, change behavior in subtle ways, or introduce risk worth flagging:

```bash
### Proposed commit message
<type>(<scope>): <imperative subject>

<body paragraph(s) explaining motivation and behavior change>

- bullet of notable change
- bullet of notable change
```

### Step 4 — Ask the user verbatim

Print exactly: **"Commit as-is, edit the message, or skip?"**

### Step 5 — Wait for explicit approval

Only after the user replies with an affirmative answer may you re-attempt the command. The OS permission prompt will then surface for final confirmation.

If the user declines or asks to edit, do not commit. Update the proposal and re-ask.

## Multi-commit work

If you have several logical commits ready, emit one full proposal per commit and gate each independently. Do not batch proposals. Do not commit any of them until each is individually approved.

## Subagent delegation

If you dispatch a subagent that will end in a gated command, you (the orchestrator) own the proposal step. Either instruct the subagent to stop before the command and report back, or require it to wait for an "approved" signal you forward only after the user approves the proposal. A subagent that commits on its own initiative is a rule violation.

## Conventional Commits format

Format the proposed message per the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Structure

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: a new feature
- `fix`: a bug fix
- `docs`: documentation only changes
- `style`: changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.)
- `refactor`: a code change that neither fixes a bug nor adds a feature
- `perf`: a code change that improves performance
- `test`: adding missing tests or correcting existing tests
- `build`: changes that affect the build system or external dependencies
- `ci`: changes to CI configuration files and scripts
- `chore`: other changes that do not modify src or test files
- `revert`: reverts a previous commit

### Guidelines

- **Description**: imperative, present tense ("add", not "added" or "adds")
- **Case**: lower-case or sentence-case, no trailing period
- **Scope**: noun in parentheses describing a section of the codebase (e.g., `feat(auth): add login validation`)
- **Body**: explain the what and why, not the how
- **Footer**: reference issues (`Closes #123`) or breaking changes (`BREAKING CHANGE: ...`)
- **Breaking changes**: indicate with `!` after the type/scope OR a `BREAKING CHANGE:` footer

### Reference files

For detailed patterns and edge cases, see `references/conventional-commits.md`.
