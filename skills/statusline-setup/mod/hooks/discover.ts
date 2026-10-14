import type { SessionMessage } from "claude-code"

import type { CheckState, Step } from "../types"

export type Platform = "github" | "azure"

export function platformOf(remote: string): Platform | null {
	if (/github\.com[:/]/.test(remote)) return "github"
	if (/dev\.azure\.com[:/]|\.visualstudio\.com\//.test(remote)) return "azure"
	return null
}

export function repoNameOf(remote: string): string {
	return (
		remote
			.trim()
			.replace(/\.git$/, "")
			.split(/[/:]/)
			.pop() ?? ""
	).toLowerCase()
}

function decoded(name: string): string {
	try {
		return decodeURIComponent(name).toLowerCase()
	} catch {
		return name.toLowerCase()
	}
}

// PR links anywhere in the conversation: a command's output (gh pr create and
// gh pr edit print the URL), the model's own text, or a link the person pasted.
// Only links into this repository count, since the fetch runs against it.
export function prNumbersIn(
	messages: readonly SessionMessage[],
	platform: Platform,
	repo: string,
): number[] {
	const pattern =
		platform === "github"
			? /github\.com\/[\w.-]+\/([\w.-]+)\/pull\/(\d{1,9})/g
			: /_git\/([^/\s?#"']+)\/pullrequest\/(\d{1,9})/gi
	const found = new Set<number>()
	for (const message of messages) {
		const texts = [message.text]
		for (const use of message.toolUses)
			texts.push(JSON.stringify(use.input), use.text ?? "")
		for (const result of message.toolResults ?? []) texts.push(result.text)
		for (const text of texts) {
			for (const match of text.matchAll(pattern)) {
				if (decoded(match[1] ?? "") === repo) found.add(Number(match[2]))
			}
		}
	}
	return [...found]
}

// Items a branch without a PR points at: a 3-9 digit segment of its name (plus
// gh issue develop's "<n>-slug"), then AB#N or #N in its own commits. 9 digits
// at most, as both APIs take 32-bit ids and one bad literal fails the query.
export function itemRefs(
	platform: Platform,
	branch: string,
	commitLog: string,
): number[] {
	const refs: string[] = []
	const lead =
		platform === "github" ? /^(\d{1,9})-/.exec(branch)?.[1] : undefined
	if (lead) refs.push(lead)
	refs.push(
		...branch.split(/[^A-Za-z0-9]+/).filter((part) => /^\d{3,9}$/.test(part)),
	)
	const pattern = platform === "github" ? /#(\d{1,9})/g : /AB#(\d{1,9})/g
	for (const match of commitLog.matchAll(pattern)) refs.push(match[1] ?? "")
	return [...new Set(refs.filter(Boolean).map(Number))].slice(0, 10)
}

export function githubChecks(rollup: string | null | undefined): CheckState {
	if (rollup === "SUCCESS") return "passing"
	if (rollup === "FAILURE" || rollup === "ERROR") return "failing"
	if (rollup === "PENDING" || rollup === "EXPECTED") return "pending"
	return "none"
}

export function azureChecks(statuses: readonly string[]): CheckState {
	if (statuses.some((s) => s === "rejected" || s === "broken")) return "failing"
	if (statuses.some((s) => s === "running" || s === "queued")) return "pending"
	if (statuses.some((s) => s === "approved")) return "passing"
	return "none"
}

export function azureReview(votes: readonly number[]): string {
	if (votes.includes(-10)) return "rejected"
	if (votes.includes(-5)) return "waiting for author"
	if (votes.some((vote) => vote >= 5)) return "approved"
	return ""
}

export const SUMMARY_SYSTEM = `You summarize a coding session for a side panel.
Reply with JSON only, no prose and no code fence:
{"goal": "<2-4 sentences: what the session is trying to achieve and where it stands now>",
 "steps": [{"text": "<one short line>", "status": "done" | "current" | "todo"}]}
Steps run in order, at most 12, and at most one is "current".`

// The newest part of the conversation that fits the model's budget.
export function transcriptOf(messages: readonly SessionMessage[]): string {
	const lines = messages.map((m) => {
		const tools = m.toolUses.map(
			(use) => `[${use.tool}] ${JSON.stringify(use.input).slice(0, 200)}`,
		)
		return `${m.role}: ${[m.text.slice(0, 2000), ...tools].filter(Boolean).join("\n")}`
	})
	return lines.join("\n\n").slice(-60_000)
}

export function parseSummary(
	text: string,
): { goal: string; steps: Step[] } | null {
	const start = text.indexOf("{")
	const end = text.lastIndexOf("}")
	if (start < 0 || end < start) return null
	try {
		const value = JSON.parse(text.slice(start, end + 1)) as {
			goal?: unknown
			steps?: unknown
		}
		if (typeof value.goal !== "string" || !Array.isArray(value.steps))
			return null
		const steps: Step[] = []
		for (const step of value.steps as { text?: unknown; status?: unknown }[]) {
			if (typeof step?.text !== "string") continue
			const status =
				step.status === "done" || step.status === "current"
					? step.status
					: "todo"
			steps.push({ text: step.text, status })
		}
		return { goal: value.goal, steps }
	} catch {
		return null
	}
}
