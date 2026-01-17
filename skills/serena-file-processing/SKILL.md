---
name: serena-file-processing
description: Master instructions for using Serena MCP tools for code navigation, search, navigation, and editing. Includes rules for terminal usage and memory management.
---

# Serena File Processing Skill

This skill defines the **authoritative rules** for using Serena tools (`view_file`, `replace_file_content`, `grep_search`, etc.) and interactions with other tools in Antigravity.

## Core Rules

### 1. Terminal Execution

- ❌ NEVER use `mcp_serena_execute_shell_command`.
- ✅ ALWAYS use `run_command` for terminal operations in Antigravity.

## Workflow Best Practices

### 2. Code Navigation

- **Symbolic First**: Use `view_file_outline` to understand file structure before reading content.
- **Search Smart**: Use `grep_search` to find usages. Constraint searches to relevant paths.
- **Jumping**: Use `view_code_item` to inspect specific functions/classes without reading the whole file.

### 3. Code Editing

- **Pattern Matching**: When using `replace_file_content` or `multi_replace_file_content`, ensure `TargetContent` is unique.
- **Context**: Use `view_file` around the target area first to ensure you have the exact string for replacement.

### 4. Memory Management

- **Limit Output**: When reading large files, read in chunks or use `view_child_nodes`.
- **Close Context**: You don't need to explicitly "close" files, but don't re-read files unnecessarily.

## Integration with Other Skills

- **Layering**: Use this skill as the foundational layer for file operations.
- **Specifics**: Higher-level skills (like `bliksund-pr-reviewer`) define *what* to look for; this skill defines *how* to look for it reliably.

## Troubleshooting

### 5. Connection Issues

If you encounter errors connecting to the Serena MCP server or tools are unavailable:

1. **Check Process Status**: Ask the user to verify if the Serena process has started.
2. **Check Workspace Config**: Ask the user to confirm if the Serena configuration has been initiated for the current workspace.
