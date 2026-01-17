# Project Overview

This project is a repository of **Artificial Intelligence Agent Skills** used by Antigravity (and potentially other agents).

## Purpose

To store, version, and manage "skills" that extend the capabilities of AI agents. Each skill provides specialized knowledge, instructions, and rules for specific domains (e.g., Markdown Compliance, React Native Patterns, Code Review).

## Structure

The codebase follows a flat structure:

- `skills/`: Contains all skill definitions.
  - `<skill-name>/`: Directory for a specific skill.
    - `SKILL.md`: The mandatory definition file containing metadata (YAML frontmatter) and instructions (Markdown).
    - (Optional) `scripts/`, `references/`, `examples/`: Helper files for the skill.

## Tech Stack

- **Languages**: Markdown, YAML.
- **Framework**: Antigravity Skills (custom format).
- **Build System**: None (Files are consumed directly by the agent).
