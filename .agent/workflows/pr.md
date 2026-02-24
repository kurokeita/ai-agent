# Workflow: Open Pull Request

This workflow guides the process of opening a Pull Request (PR) from the current working branch toward the `main` branch. It ensures consistency with project standards, semantic versioning, and automated tooling.

## 1. Prerequisites

- **GitHub CLI (`gh`)**: Must be installed and authenticated.
- **Clean State**: Ensure all changes for the current task are committed following the [Commit Guidelines](conductor/workflow.md#commit-guidelines).
- **Project Standards**: All code must pass linting (`pnpm run lint`) and formatting checks.

## 2. PR Creation Process

### Step 1: Pre-flight Checks
1. **Verify Branch**: Ensure you are not on the `main` branch.
2. **Push Changes**: Push the current branch to the remote repository.
   ```bash
   git push -u origin $(git branch --show-current)
   ```
3. **Run Linting**: Execute the full linting suite to ensure zero regressions.
   ```bash
   pnpm run lint
   ```

### Step 2: Generate PR Content
1. **Title**: Use a semantic title if the PR contains a single focused change (e.g., `feat: Add status command`). Otherwise, use a descriptive summary.
2. **Body**: 
   - **Summary**: A high-level overview of the changes.
   - **Key Changes**: Bullet points of major modifications.
   - **Verification**: List the automated and manual steps taken to verify the changes.
   - **Related Tracks**: Link to the relevant track in `conductor/tracks.md`.

### Step 3: Open PR using `gh`
Execute the `gh pr create` command with the generated content.
```bash
gh pr create --base main --title "<title>" --body "<body>"
```

## 3. Post-Creation

1. **Review**: Check the PR on GitHub for any CI failures.
2. **Track Status**: If this PR completes a track, ensure the track is marked as `[x] Completed` in `conductor/tracks.md`.
3. **Draft Mode**: Use the `--draft` flag with `gh pr create` if the work is still in progress and you want early feedback.

## 4. Troubleshooting

- **Auth Issues**: If `gh` fails with authentication errors, run `gh auth login`.
- **Target Branch**: Always target `main` unless explicitly requested otherwise.
