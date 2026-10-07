#!/usr/bin/env python3
import json
import os
import re
import shlex
import sys

ASK = "Commit as-is, edit the message, or skip?"
BULLETS = ["Scope", "Behavior change", "Architecture/contract impact", "Tests", "Risk notes"]
SUBJECT = re.compile(r"^[a-z]+(\([^)]+\))?!?: \S")
STATE_DIR = os.path.expanduser("~/.cache/commit-gate")
HOW = (
    "Write the proposal (### Technical summary with the five bullets, then ### Proposed commit message with the message in a ``` code fence) "
    "as your final chat message and end the turn. The Stop hook records it and sends you back to ask "
    f'with AskUserQuestion: question "{ASK}", first option "Commit as-is".'
)


def proposal_problems(text):
    missing = []

    if "### Technical summary" not in text:
        missing.append('"### Technical summary" heading')

    for bullet in BULLETS:
        if not re.search(rf"^- {re.escape(bullet)}:[ \t]*(\S|\n[ \t]+\S)", text, re.M):
            missing.append(f'filled "- {bullet}:" bullet')

    message = proposed_message(text).splitlines()

    if not message or not SUBJECT.match(message[0]):
        missing.append('"### Proposed commit message" followed by a ``` code fence whose first line is "<type>(<scope>): <subject>"')

    return missing


def proposed_message(text):
    after = text.partition("### Proposed commit message")[2].lstrip("\n")
    fenced = re.match(r"```[^\n]*\n(.*?)\n```", after, re.S)

    return fenced.group(1).strip() if fenced else ""


def normalize(text):
    return " ".join(text.split())


def commit_command_problems(command, message):
    if re.search(r"co-authored-by|generated with claude code", command, re.I):
        return "Remove the Co-Authored-By and 'Generated with Claude Code' lines; the user's rules forbid attribution."

    if re.search(r"(?:^|\s)(?:-[a-zA-Z]*F|--file)(?:[\s=]|$)", command) or not re.search(r"(?:^|\s)(?:-[a-zA-Z]*m|--message)(?:[\s=]|$)", command):
        return "Pass the message with -m, using a quoted heredoc: -m \"$(cat <<'EOF' ... EOF)\". The hook cannot check -F, the editor, or --amend without -m."

    if normalize(message) not in normalize(command):
        return "The commit message differs from the approved proposal. Use the approved message verbatim, or propose the new one and ask again."

    return None


def is_commit_question(question):
    labels = [o.get("label", "") for o in question.get("options", [])]

    return any(re.match(r"\s*commit as-is\b", label, re.I) for label in labels) or "commit" in question.get("header", "").lower()


def is_git_commit(command):
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|()")
        lexer.whitespace_split = True
        tokens = list(lexer)
    except ValueError:
        return bool(re.search(r"\bgit\b.*\bcommit\b", command))

    for i, token in enumerate(tokens):
        if os.path.basename(token) != "git":
            continue

        rest = tokens[i + 1:]

        while rest and rest[0].startswith("-"):
            rest = rest[2:] if rest[0] in ("-C", "-c") else rest[1:]

        if rest and rest[0] == "commit":
            return True

    return False


def load(path):
    try:
        return json.load(open(path))
    except (OSError, ValueError):
        return None


def save(path, state):
    os.makedirs(STATE_DIR, exist_ok=True)
    json.dump(state, open(path, "w"))


def drop(path):
    if os.path.exists(path):
        os.remove(path)


def decide(payload, path):
    event = payload.get("hook_event_name")
    state = load(path)

    if event == "Stop":
        text = payload.get("last_assistant_message") or ""

        if not re.search(r"^### (Technical summary|Proposed commit message)\s*$", text, re.M):
            return None

        missing = proposal_problems(text)

        if payload.get("stop_hook_active") and (missing or state):
            return None

        if missing:
            return {"decision": "block", "reason": "Commit proposal incomplete. Missing: " + "; ".join(missing) + ". " + HOW}

        save(path, {"approved": False, "message": proposed_message(text)})

        return {"decision": "block", "reason": f'Proposal recorded. Now call AskUserQuestion with question "{ASK}" and first option "Commit as-is".'}

    tool_input = payload.get("tool_input") or {}
    questions = [q for q in tool_input.get("questions", []) if is_commit_question(q)]

    if event == "PreToolUse" and payload.get("tool_name") == "AskUserQuestion" and questions:
        if not state or state.get("approved"):
            return deny("No recorded commit proposal. " + HOW)

        if not all(ASK in q.get("question", "") for q in questions):
            return deny(f'The commit question text must include "{ASK}".')

        return None

    if event == "PostToolUse" and payload.get("tool_name") == "AskUserQuestion" and questions:
        answers = (payload.get("tool_response") or {}).get("answers", {})
        approved = all(re.match(r"\s*commit as-is\b", answers.get(q.get("question"), ""), re.I) for q in questions)

        if approved:
            save(path, {**state, "approved": True})
        else:
            drop(path)

        return None

    if event == "PreToolUse" and payload.get("tool_name") == "Bash" and is_git_commit(tool_input.get("command", "")):
        if not state or not state.get("approved"):
            return deny("git commit needs an approved proposal. " + HOW)

        problem = commit_command_problems(tool_input["command"], state.get("message", ""))

        if problem:
            return deny(problem)

        drop(path)

    return None


def deny(reason):
    return {"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": reason}}


def main():
    payload = json.load(sys.stdin)
    path = os.path.join(STATE_DIR, f"{payload.get('session_id', 'unknown')}.json")
    result = decide(payload, path)

    if result:
        print(json.dumps(result))


def self_test():
    global STATE_DIR
    import tempfile

    STATE_DIR = tempfile.mkdtemp()
    path = os.path.join(STATE_DIR, "s.json")
    good = (
        "### Technical summary\n- Scope:\n  - a.ts: loader gate\n- Behavior change: 403 for viewers\n"
        "- Architecture/contract impact: none\n- Tests: 101 pass\n- Risk notes: none\n\n"
        "### Proposed commit message\n```\nfix(api-access): gate the MCPs page loader\n\nViewers without manage rights\nnow get a 403.\n```\n\n" + ASK
    )
    question = {"question": ASK, "header": "Commit 1", "options": [{"label": "Commit as-is"}, {"label": "Skip"}]}
    ask = {"hook_event_name": "PreToolUse", "tool_name": "AskUserQuestion", "tool_input": {"questions": [question]}}
    heredoc = "git -C /repo commit -m \"$(cat <<'EOF'\nfix(api-access): gate the MCPs page loader\n\nViewers without manage rights now get a 403.\nEOF\n)\""
    commit = {"hook_event_name": "PreToolUse", "tool_name": "Bash", "tool_input": {"command": heredoc}}

    def run(command):
        return decide({**commit, "tool_input": {"command": command}}, path)

    def answered(label):
        return {**ask, "hook_event_name": "PostToolUse", "tool_response": {"answers": {ASK: label}}}

    assert decide(ask, path), "popup without a recorded proposal is denied"
    assert decide(commit, path), "commit without approval is denied"
    assert "incomplete" in decide({"hook_event_name": "Stop", "last_assistant_message": good.replace("- Tests: 101 pass", "- Tests:")}, path)["reason"]
    assert "recorded" in decide({"hook_event_name": "Stop", "last_assistant_message": good}, path)["reason"]
    assert decide({"hook_event_name": "Stop", "last_assistant_message": good, "stop_hook_active": True}, path) is None
    assert decide(ask, path) is None
    assert decide(answered("Commit as-is (Recommended)"), path) is None
    assert "differs" in run('git commit -m "fix(api-access): something else"')["hookSpecificOutput"]["permissionDecisionReason"]
    assert "attribution" in run(heredoc.replace("\nEOF", "\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nEOF"))["hookSpecificOutput"]["permissionDecisionReason"]
    assert "-F" in run("git commit -F msg.txt")["hookSpecificOutput"]["permissionDecisionReason"]
    assert run("git commit --amend --no-edit"), "bare amend is denied"
    assert decide(commit, path) is None, "approved commit with the proposed message runs"
    assert decide(commit, path), "approval is single use"
    unfenced = good.replace("```\nfix(api-access)", "fix(api-access)").replace("403.\n```", "403.")
    assert "fence" in decide({"hook_event_name": "Stop", "last_assistant_message": unfenced}, path)["reason"]
    decide({"hook_event_name": "Stop", "last_assistant_message": good.replace("\n\n" + ASK, "\n\nNote: trailers left out.\n\n" + ASK)}, path)
    assert "trailers" not in load(path)["message"], "prose after the fence is not part of the message"
    drop(path)
    assert decide({"hook_event_name": "Stop", "last_assistant_message": "All done."}, path) is None
    assert decide({"hook_event_name": "Stop", "last_assistant_message": "End with `### Technical summary` and `### Proposed commit message`."}, path) is None
    assert decide({"hook_event_name": "Stop", "last_assistant_message": "### Technical summary\n- Scope:", "stop_hook_active": True}, path) is None
    assert "recorded" in decide({"hook_event_name": "Stop", "last_assistant_message": good, "stop_hook_active": True}, path)["reason"]
    drop(path)
    decide({"hook_event_name": "Stop", "last_assistant_message": good}, path)
    decide(answered("Skip"), path)
    assert decide(commit, path), "skip cancels the proposal"
    assert not is_git_commit("git log --grep commit")
    assert is_git_commit("cd x && git commit --amend")
    assert decide({**ask, "tool_input": {"questions": [{"question": "Which branch?", "header": "Branch", "options": [{"label": "Commit to current branch"}]}]}}, path) is None
    print("ok")


if __name__ == "__main__":
    self_test() if sys.argv[1:] == ["--self-test"] else main()
