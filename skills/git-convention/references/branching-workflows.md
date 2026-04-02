# Advanced Branching and Merging Strategies

Choosing the right branching strategy is crucial for team collaboration and continuous delivery.

## Gitflow Workflow

Gitflow is a legacy Git workflow that was first published and made popular by Vincent Driessen. It's often used for projects that have a scheduled release cycle.

- `main` branch stores the official release history.
- `develop` branch serves as an integration branch for features.
- `feature/*` branches are used for developing new features.
- `release/*` branches support preparation of a new production release.
- `hotfix/*` branches are used to quickly patch production releases.

## GitHub Flow

GitHub Flow is a lightweight, branch-based workflow that supports teams and projects where deployments happen regularly.

- Anything in the `main` branch is deployable.
- To work on something new, create a descriptive branch off of `main`.
- Commit to that branch locally and regularly push your work to the same named branch on the server.
- When you need feedback or help, or you think the branch is ready for merging, open a pull request.
- After someone else has reviewed and signed off on the feature, you can merge it into `main`.
- Once it is merged and pushed to `main`, you can and should deploy immediately.

## Trunk-Based Development

A version control management strategy where developers merge small, frequent updates to a core “trunk” or main branch.

- High frequency of commits.
- Small PRs.
- Continuous Integration.
- Feature flags are often used to hide work-in-progress.

## Merging vs Rebasing

### Merging

`git merge` is a "non-destructive" operation. The existing branches are not changed in any way. This avoids all of the potential pitfalls of rebasing.

```bash
git checkout feature/abc
git merge main
```

### Rebasing

`git rebase` moves the entire feature branch to begin on the tip of the `main` branch, effectively incorporating all of the new commits in `main`. It re-writes the project history by creating brand new commits for each commit in the original branch.

```bash
git checkout feature/abc
git rebase main
```

**Golden Rule of Rebasing**: Never use it on public branches.

## Conflict Resolution

1. Identify the conflict: `git status` will show unmerged paths.
2. Open the files and look for `<<<<<<<`, `=======`, `>>>>>>>`.
3. Decide which changes to keep.
4. Stage the resolved files: `git add <file>`.
5. Complete the merge or rebase: `git commit` or `git rebase --continue`.
