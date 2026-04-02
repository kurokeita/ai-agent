# Git Clean Up Tool Options

Detailed reference for CLI options and configuration settings for the `@kurokeita/git-clean-up` tool.

## Core Commands

### `scan`

Audits the repository and lists hygiene issues without modifying any resources.

**Options:**

- `--json`: Output findings in JSON format for programmatic parsing.
- `--include <categories>`: Comma-separated list of categories to scan (branches, stashes, worktrees).
- `--target <branch>`: Specify the primary integration branch (default: `main` or `master`).
- `--age-days <number>`: Filter stashes or inactive branches older than X days.

### `clean`

Previews or applies deletions based on hygiene audit results.

**Options:**

- `--apply`: Actually execute the deletion of selected items. Without this flag, the command only provides a preview.
- `--all`: Select all identified hygiene issues for cleanup.
- `--include <categories>`: Limit cleanup to specific categories (e.g., `--include branches`).
- `--force`: Force removal even if safety checks fail (use with extreme caution).

## Configuration File

Behavior can be customized using a `.git-clean-up.json` file in the repository root or a global configuration at `~/.git-clean-up.json`.

### Example Configuration

```json
{
  "protectedBranches": [
    "release/*",
    "hotfix/*",
    "production"
  ],
  "includeCategories": [
    "branches",
    "stashes",
    "worktrees"
  ],
  "stashAgeDays": 14,
  "defaultTargetBranch": "origin/develop",
  "branchInactiveDays": 30
}
```

## Policy Enforcement (CI Mode)

The tool can be used in CI pipelines to enforce repository hygiene.

- `--fail-on <level>`: Exit with a non-zero code if findings of a certain risk level (low, medium, high) are found.
- `--max-findings <number>`: Fail if the total number of hygiene issues exceeds the specified threshold.
- `--summary`: Output a high-level summary of findings, ideal for build logs.
