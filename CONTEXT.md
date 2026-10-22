# AI Agent Manager

A CLI that installs a curated set of skills into the AI coding tools a developer uses, from one shared place.

## Language

### What gets installed

**Skill**:
A folder of instructions (and optional scripts or hooks) that an AI coding tool loads on demand. Installs to every chosen platform.
_Avoid_: Agent, workflow, command

**Mod**:
A Claude Code extension that changes Claude Code's own interface or behavior, such as a pane, slash command or hook. It ships inside a skill and is never installed on its own.
_Avoid_: Plugin, extension

**Catalog**:
The skills this package ships.
_Avoid_: Database, assets

### Where it goes

**Platform**:
An AI coding tool the CLI installs into: Antigravity, Claude Code, Codex, Gemini CLI, GitHub Copilot or Windsurf.
_Avoid_: Target, environment, assistant

**Scope**:
Whether an install applies to the user everywhere (global) or to one git repository (project).

**Hub**:
The single `.agents/` folder that holds the canonical copy of every installed skill, linked into each platform at session start.
_Avoid_: Agents directory, source folder

### The work pane

**Work pane**:
The Claude Code side pane, opened with `/work`, that shows a session's summary, steps, pull requests and work items.
_Avoid_: Work panel, side panel, work box

**Resumed session**:
A Claude Code conversation continued from an earlier one, through `--resume`, `--continue`, the session picker or `/resume`. A new session and a `/clear` are not resumed sessions.
