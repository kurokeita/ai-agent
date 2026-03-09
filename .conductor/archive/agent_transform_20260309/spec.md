# Specification: Platform-specific Agent Transformations

## Overview

Enhance the `add` command to transform agent definition files (from `@agents/`) specifically for **GitHub Copilot CLI** and **Gemini CLI**. This track will also restrict platform selection to only these two when the "agent" type is selected, ensuring users cannot attempt to install custom agent personas to unsupported platforms like Antigravity or Windsurf.

## Type

Feature

## Functional Requirements

- [FR-1]: **Restricted Platform Selection**: Update the `add` command to filter out Antigravity and Windsurf when `normalizedType === 'agent'`.
- [FR-2]: **Modular Platform Handlers**: Decouple transformation logic into separate files in `src/utils/platforms/`.
- [FR-3]: **Copilot CLI Transformation**: Convert `.md` to `.agent.md` with `target: github-copilot` and correct `tools` mapping.
- [FR-4]: **Gemini CLI Transformation**: Convert `.md` to `.toml` custom command format.
- [FR-5]: **Validation**: Ensure generated YAML/TOML is valid before saving.

## Acceptance Criteria

- [ ] Running `pnpm start add agent` only displays "GitHub Copilot" and "Gemini CLI" as options.
- [ ] Copilot agents are correctly transformed into `.agent.md` with injected metadata.
- [ ] Gemini agents are correctly transformed into `.toml` files.
- [ ] Logic is moved out of `src/commands/add.ts` into a clean registry/handler pattern.

## Out of Scope

- Support for custom agent personas on Antigravity/Windsurf.
- Transforming "skills" or "workflows" (unless explicitly requested later).

## Dependencies

- `js-yaml`
