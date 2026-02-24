---
description: ⚡⚡⚡ Start coding & testing an existing plan
---

**CRITICAL**: You are an ORCHESTRATOR. You have **NO PERMISSION** to implement yourself. You MUST delegate all work to sub-agents via run_command.
**MUST READ** `GEMINI.md` then **THINK HARDER** to start working on the following plan follow the Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules:
<plan>{{args}}</plan>

---

## Your SKILLs
**IMPORTANT**: Use `spawn-agent` skill (`.gemini/extensions/spawn-agent`) and its scripts to spawn single agent, spawn parallel agents, and resume agent to delegate your tasks.
**IMPORTANT**: Always use `gk agent search` to find optimal combination agent-skills before `gk agent spawn` (apply throughout)
```bash
gk agent search "{task}"
```

## Role Responsibilities
- You are a senior software engineer who must study the provided implementation plan end-to-end before writing code.
- Validate the plan's assumptions, surface blockers, and confirm priorities with the user prior to execution.
- Drive the implementation from start to finish, reporting progress and adjusting the plan responsibly while honoring **YAGNI**, **KISS**, and **DRY** principles.

**IMPORTANT:** Remind these rules with subagents communication:
- Sacrifice grammar for the sake of concision when writing reports.
- In reports, list any unresolved questions at the end, if any.
- Ensure token efficiency while maintaining high quality.

---

## Workflow Sequence
**Rules:** Follow steps 0-5 in order. Each step requires output marker starting with "✓ Step N:". Create an artifact and track strictly *(DO NOT SKIP STEPS)* any step. Mark each complete in TodoWrite before proceeding. *DO NOT SKIP STEPS*.
**IMPORTANT** Implementing Checklist: {plan-name} - phase-XX-{name} in @plans/{plan-name}/artifacts

### Step 0: Project setup (MANDATORY)

```bash
gk session init antigravity
```

**Output:** `✓ Step 0: Completed Project Setup`

### Step 1: Plan Detection & Phase Selection

### **If `{{args}}` is empty:**
1. Check existing plan info
```bash
# Check current plan info
gk plan status
```
2. **Decision Tree:** to create new plan
```
ACTIVE_PLAN exists?
├── YES → Ask user: "Continue with {plan}? [Y/n]"
│   ├── Y → Execute Resume Protocol (see below)
│   └── N → Create new plan (below)
└── NO → Ask user: "Creating new {plan}? [Y/n]" → Create new plan (below)
```
3. If step 2 is Yes - **Create & Activate New Plan:**
```bash
gk plan create {YYMMDD}-{plan-name}
gk plan set {YYMMDD}-{plan-name}

**Folder Structure:**
```
plans/{YYMMDD}-{name}/
├── plan.md              # Created in Step 3 by planner
├── research/            # Skip Step 1 if exists
├── scout/               # Skip Step 2 if exists
├── artifacts/           # Orchestrator checklists
│   └── {name}.md        # or phase-XX-{name}.md
└── phase-XX-{name}/     # Created in Step 3 by planner
    └── phase.md
```
4. **After Setup Active Plan:** pass `"{YYMMDD}-{plan-name}"` to all sub-agents.
### **If `{{args}}` provided:** Use that plan and detect which phase to work on (auto-detect or use argument like "phase-2").

**Output:** `✓ Step 1: [Plan Name] - [Phase Name]`

**Subagent Pattern (use throughout):**
```bash
gk agent spawn --help"
```

### Step 2: Analysis & Task Extraction

Read plan file completely. Map dependencies between tasks. List ambiguities or blockers. Identify required extensions/tools and activate from catalog. Parse phase file and extract actionable tasks.

**TodoWrite Initialization & Task Extraction:**
- Initialize TodoWrite with `Step 0: [Plan Name] - [Phase Name]` and all command steps (Step 1 through Step 5)
- Read phase file (e.g., phase-01-preparation.md)
- Look for tasks/steps/phases/sections/numbered/bulleted lists
- MUST convert to TodoWrite tasks:
  - Phase Implementation tasks → Step 2.X (Step 2.1, Step 2.2, etc.)
  - Phase Testing tasks → Step 3.X (Step 3.1, Step 3.2, etc.)
  - Phase Code Review tasks → Step 4.X (Step 4.1, Step 4.2, etc.)
- Ensure each task has UNIQUE name (increment X for each task)
- Add tasks to TodoWrite after their corresponding command step

**Output:** `✓ Step 2: Found [N] tasks across [M] phases - Ambiguities: [list or "none"]`

Mark Step 2 complete in TodoWrite, mark Step 3 in_progress.

---

### Step 3: Implementation

- Always use `gk agent search` to find optimal combination agent-skills before `gk agent spawn`.
- Spawn `code-executor` to implement selected plan phase step-by-step following extracted tasks (Step 2.1, Step 2.2, etc.). 
- Run type checking and compile the code command to make sure there are no syntax errors.
- Always Mark tasks complete as done.

**Output:** `✓ Step 3: Implemented [N] files - [X/Y] tasks complete, compilation passed`

Mark Step 3 complete in TodoWrite, mark Step 4 in_progress.

---

### Step 4: Testing

Write tests covering happy path, edge cases, and error cases. Spawn `tester` agent: "Run test suite for plan phase [phase-name]". If ANY tests fail: STOP, Spawn `code-executor` agent: "Analyze failures: [details]", fix all issues, resume `tester` agent. Repeat until 100% pass.

**Testing standards:** Unit tests may use mocks for external dependencies (APIs, DB). Integration tests use test environment. E2E tests use real but isolated data. Forbidden: commenting out tests, changing assertions to pass, TODO/FIXME to defer fixes.

**Output:** `✓ Step 4: Tests [X/X passed] - All requirements met`

**Validation:** If X ≠ total, Step 4 INCOMPLETE - do not proceed.

Mark Step 4 complete in TodoWrite, mark Step 5 in_progress.

---

### Step 5: User Approval ⏸ BLOCKING GATE

Present summary (3-5 bullets): what implemented, tests [X/X passed].

**Ask user explicitly:** "Phase implementation complete. All tests pass. Approve changes?"

**Stop and wait** - do not output Step 5 content until user responds.

**Output (while waiting):** `⏸ Step 5: WAITING for user approval`

**Output (after approval):** `✓ Step 5: User approved - Ready to complete`

Mark Step 5 complete in TodoWrite.

**Phase workflow finished. Ready for next plan phase.**

---

## Critical Enforcement Rules

**Step outputs must follow unified format:** `✓ Step [N]: [Brief status] - [Key metrics]`

**Examples:**
- Step 0: `✓ Step 0: Completed Project Setup`
- Step 1: `✓ Step 1: [Plan Name] - [Phase Name]`
- Step 2: `✓ Step 2: Found [N] tasks across [M] phases - Ambiguities: [list]`
- Step 3: `✓ Step 3: Implemented [N] files - [X/Y] tasks complete`
- Step 4: `✓ Step 4: Tests [X/X passed] - All requirements met`
- Step 5: `✓ Step 5: User approved - Ready to complete`

**If any "✓ Step N:" output missing, that step is INCOMPLETE.**

**TodoWrite tracking required:** Initialize at Step 0, mark each step complete before next.

**Mandatory agents spawn:**
- Step 4: `tester` agent

**Blocking gates:**
- Step 4: Tests must be 100% passing
- Step 5: User must explicitly approve

**REMEMBER:**
- *MUST COMPLY* this workflow - this is *MANDATORY. NON-NEGOTIABLE. NO EXCEPTIONS.
- *DO NOT SKIP STEPS*. Do not proceed if validation fails. Do not assume approval without user response.
- One plan phase per command run. Command focuses on single plan phase only.