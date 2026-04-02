---
name: git-clean
description: This skill should be used when the user asks to "clean the repository", "remove stale branches", "clear old stashes", "manage git hygiene", or "scan for redundant worktrees". Uses the @kurokeita/git-clean-up tool to audit and safely remove unused Git resources.
version: 1.0.0
---

# Git Clean Skill

Maintain repository hygiene by scanning for and removing stale branches, forgotten stashes, and redundant worktrees using the `@kurokeita/git-clean-up` tool.

## When to Use This Skill

- Auditing the repository for stale or merged branches.
- Cleaning up old stashes or redundant Git worktrees.
- Improving local performance by removing unneeded Git objects.
- Automating repository hygiene tasks.

## Workflow

Follow this procedure to safely clean the repository:

### 1. Audit findings

Run an initial scan to identify hygiene issues without making any changes. Use the `--json` flag if programmatic analysis is needed.

```bash
npx @kurokeita/git-clean-up scan
```

### 2. Present report

Summarize the findings for the user, categorized by:

- **Branches**: Merged, squash-merged, or branches without upstreams.
- **Stashes**: Old stashes or stale WIPs.
- **Worktrees**: Missing paths or detached HEADs.

### 3. Solicit confirmation

Present the findings to the user and ask which items or categories they would like to clean. Do NOT proceed to deletion without explicit user approval.

### 4. Preview cleanup (Optional but Recommended)

If the user wants to see exactly what will be deleted for a specific selection, run the clean command without the `--apply` flag.

```bash
# Preview all deletions
npx @kurokeita/git-clean-up clean --all

# Preview specific categories
npx @kurokeita/git-clean-up clean --include branches,stashes
```

### 5. Execute cleanup

After receiving confirmation, run the clean command with the `--apply` flag.

```bash
# Clean everything confirmed
npx @kurokeita/git-clean-up clean --apply --all

# Clean specific categories
npx @kurokeita/git-clean-up clean --apply --include branches
```

## Safety Considerations

- **Protected Branches**: The tool automatically protects `main`, `master`, `develop`, and `dev`. Do not attempt to override these protections unless explicitly instructed.
- **Active Branches**: Branches checked out in other worktrees are skipped by default.
- **Verification**: Always verify the list of findings with the user before applying deletions.

## Additional Resources

### Reference Files

- **`references/tool-options.md`**: Detailed CLI options and configuration settings for `git-clean-up`.

### Example Configurations

- **`examples/config.json`**: Sample `.git-clean-up.json` for repository-specific hygiene policies.
