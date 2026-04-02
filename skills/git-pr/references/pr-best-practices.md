# Pull Request Description Best Practices

A well-crafted pull request (PR) description is essential for effective code review, maintaining project history, and ensuring that changes meet quality standards.

## Core Components

The most effective PR templates across major open-source repositories (like React, VS Code, and Kubernetes) share these core components:

### 1. Summary & Motivation

Explain **what** you changed and **why** you changed it.

- What problem does this PR solve?
- What is the context for this change?
- Are there any architectural decisions or trade-offs made?

### 2. Related Issues

Always link to the issue(s) being addressed. Use keywords that GitHub recognizes to automatically close issues when the PR is merged:

- `Fixes #123`

- `Closes #123`

- `Resolves #123`

### 3. Type of Change

Categorize the PR to help maintainers quickly understand its impact:

- **Bug Fix**: Non-breaking change that fixes an issue.

- **New Feature**: Non-breaking change that adds functionality.

- **Breaking Change**: Fix or feature that would cause existing functionality to change.
- **Documentation**: Changes to documentation only.
- **Refactor**: Code change that neither fixes a bug nor adds a feature.

### 4. Test Plan (Verification)

Describe how you verified your changes. This is the most critical section for reviewers.

- **Automated Tests**: Mention new or existing tests that cover the changes.
- **Manual Testing**: List the steps taken to manually verify the behavior.
- **Screenshots/Gifs**: Provide visual evidence for UI/UX changes.

### 5. Checklist

A set of mandatory steps the contributor must confirm:

- [ ] My code follows the project's style guidelines.
- [ ] I have performed a self-review of my code.
- [ ] I have added tests that cover my changes.
- [ ] All new and existing tests passed.
- [ ] I have updated the documentation accordingly.

### 6. Special Notes for Reviewers

Use this section to highlight specific areas where you need feedback or to explain complex logic that might be hard to follow.

## Best Practices

- **Keep it focused**: One logical change per PR. Small PRs are easier to review and less likely to introduce bugs.
- **Write for the future**: Your PR description will be part of the repository's history. Write it so that someone reading it a year from now can understand the context.
- **Be concise but thorough**: Avoid "fluff," but don't leave out critical information.
- **Update the description**: If the PR evolves during the review process, update the description to reflect the final state of the changes.
