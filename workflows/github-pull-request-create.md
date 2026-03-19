---
description: Create a GitHub Pull Request for the current branch following project standards. Use when preparing a PR, generating PR title/body, validating branch state, and running the project's configured lint and type-check commands before `gh pr create`.
---

# /pr - GitHub Pull Request

$ARGUMENTS

---

## Purpose

This command prepares and creates a GitHub Pull Request for the current branch.

It must validate the branch state, run the project's configured quality checks, generate a professional PR title/body, and only then create the PR.

---

## Critical Rules

1. **Never create a PR from `main`**
2. **Never create a PR with no commits relative to `main`**
3. **Always run the project's configured lint command before creating the PR**
4. **Always run the project's configured type-check command before creating the PR**
5. **Stop and report the failure if linting or type checking fails**

---

## Validation Order

1. **Confirm branch state**
   - Run `git branch --show-current`
   - Refuse to continue if the current branch is `main`

2. **Confirm there is work to merge**
   - Run `git log main..HEAD --oneline`
   - Refuse to continue if there are no commits

3. **Discover project validation commands**
   - Inspect project scripts and config first, such as `package.json`, `Makefile`, `justfile`, `cargo`, or other repo-standard task runners
   - Prefer explicit project commands over guessed generic commands

4. **Run linting**
   - Use the project's configured lint command
   - Example for this repository: `pnpm run lint`

5. **Run type checking**
   - Use the project's configured type-check command if one exists
   - If no dedicated script exists but the project is TypeScript-based, run the established repo equivalent that performs type checking
   - Example for this repository: `pnpm exec tsc --noEmit`

6. **Push branch**
   - Run `git push -u origin $(git branch --show-current)` after validations pass

7. **Create PR**
   - Run `gh pr create --base main --title "<title>" --body "<body>" {{args}}`
   - Include `--draft` when the work is incomplete or requested in `$ARGUMENTS`

---

## PR Content Requirements

### Title

- Use a semantic title such as `feat: ...`, `fix: ...`, `chore: ...`, or `docs: ...`
- Match the actual change scope

### Body

Include these sections:

1. **Summary**
   - Concise explanation of the purpose of the PR

2. **Key Changes**
   - Bulleted list of the most important code changes

3. **Verification**
   - Automated: list the lint and type-check commands that were run and whether they passed
   - Manual: briefly describe any manual verification performed

4. **Related Tracks**
   - Reference relevant track information from `conductor/tracks.md` when applicable

---

## Command Context

Gather this context before writing the PR:

- Current branch: `git branch --show-current`
- Commits relative to `main`: `git log main..HEAD --oneline`
- Diff summary: `git diff main..HEAD --stat`

Use that information to write a PR description that reflects the actual technical changes.

---

## Output Format

```markdown
## PR Ready

### Title
feat: short, accurate summary

### Body
## Summary
...

## Key Changes
- ...

## Verification
- Automated: `pnpm run lint` ✅
- Automated: `pnpm exec tsc --noEmit` ✅
- Manual: ...

## Related Tracks
- ...
```

If validation fails, report the failing command and do not create the PR.

---

## Usage Examples

```text
/pr
/pr --draft
/pr --draft --assignee @me
/pr --label bug
```
