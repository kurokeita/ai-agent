import type { EngineInterface, Register } from "claude-code"
import { atom, read, update } from "claude-code"

import type { CheckState, Pr, Step } from "../types"
import {
	parseSummary,
	platformOf,
	prNumbersIn,
	repoNameOf,
	SUMMARY_SYSTEM,
	transcriptOf,
} from "./discover"
import { fetchAzure, fetchGitHub, git, type Run } from "./fetch"

const PANE = "work-items"
const branches = atom({ plugin: "work-items", key: "branches" } as const, [])
const work = atom({ plugin: "work-items", key: "work" } as const, null)
const isFetching = atom(
	{ plugin: "work-items", key: "isFetching" } as const,
	false,
)
const summary = atom({ plugin: "work-items", key: "summary" } as const, null)
const isSummarizing = atom(
	{ plugin: "work-items", key: "isSummarizing" } as const,
	false,
)
const collapsed = atom({ plugin: "work-items", key: "collapsed" } as const, [])

let isFetchRunning = false
let isAutoOpenWanted = false
let isAutoOpened = false
// Which conversation this process shows, and whether a prompt was sent in it here.
let watchedId = ""
let hasPromptedHere = false
let isClearPending = false
let sessionStartedAt = Date.now()

const runner =
	($: EngineInterface): Run =>
	(argv) =>
		$.process
			.run(argv, { timeoutMs: 60_000 })
			.catch((error) => ({ exitCode: 1, stdout: "", stderr: String(error) }))

const isPaneOpen = async ($: EngineInterface) =>
	(await $.ui.panes()).some((pane) => pane.id === PANE)

// The branches this session sat on at the end of a turn, newest first.
async function noteBranch($: EngineInterface): Promise<string> {
	const branch = await git(runner($), ["branch", "--show-current"])
	if (branch)
		await update($, branches, (list) =>
			[branch, ...list.filter((b) => b !== branch)].slice(0, 10),
		)
	return branch
}

// The current branch, plus the branches this session committed to. A branch the
// session only started on or passed through has no commits since it began.
async function trackedBranches(
	$: EngineInterface,
	current: string,
): Promise<string[]> {
	const since = `--since=${new Date(sessionStartedAt).toISOString()}`
	const tracked = current ? [current] : []
	for (const branch of await read($, branches)) {
		if (branch === current) continue
		if (await git(runner($), ["log", "-1", "--format=%H", since, branch]))
			tracked.push(branch)
	}
	return tracked
}

async function refreshWork($: EngineInterface) {
	if (isFetchRunning) return
	isFetchRunning = true
	await update($, isFetching, () => true)
	try {
		const remote = await git(runner($), ["remote", "get-url", "origin"])
		const platform = platformOf(remote)
		if (!platform) {
			await update($, work, () => ({
				prs: [],
				items: [],
				fetchedAt: Date.now(),
				error: "origin is neither GitHub nor Azure DevOps.",
			}))
			return
		}
		const current = await noteBranch($)
		const prNumbers = prNumbersIn(
			await $.session.messages(),
			platform,
			repoNameOf(remote),
		)
		const fetch = platform === "github" ? fetchGitHub : fetchAzure
		const result = await fetch(
			runner($),
			await trackedBranches($, current),
			prNumbers,
		)
		await update($, work, () => result)
	} finally {
		isFetchRunning = false
		await update($, isFetching, () => false)
	}
}

async function summarize($: EngineInterface) {
	if (await read($, isSummarizing)) return
	await update($, isSummarizing, () => true)
	try {
		const prompt = transcriptOf(await $.session.messages())
		// The API refuses an empty user message with a 400.
		if (!prompt.trim()) {
			await update($, summary, () => ({
				error: "Nothing to summarize yet. Send a prompt first.",
				at: Date.now(),
			}))
			return
		}
		const reply = await $.model.complete({
			model: "haiku",
			system: SUMMARY_SYSTEM,
			prompt,
			maxTokens: 1500,
		})
		const parsed = reply.isAnswered ? parseSummary(reply.text) : null
		const error = reply.isAnswered
			? "The summary came back unreadable."
			: reply.reason === "api-error"
				? `Summary failed: api-error ${reply.status ?? ""} ${reply.error}`
				: `Summary failed: ${reply.reason}`
		await update($, summary, () =>
			parsed ? { ...parsed, at: Date.now() } : { error, at: Date.now() },
		)
	} finally {
		await update($, isSummarizing, () => false)
	}
}

// Summarizes once when the pane shows and no summary exists yet, or the last try failed.
async function summarizeIfMissing($: EngineInterface) {
	const current = await read($, summary)
	if (!current || "error" in current) await summarize($)
}

// Opens the pane once in a resumed session, the first time it has a PR or item.
async function autoOpen($: EngineInterface) {
	if (!isAutoOpenWanted || isAutoOpened) return
	await refreshWork($)
	const current = await read($, work)
	if (
		isAutoOpened ||
		!current ||
		current.prs.length + current.items.length === 0
	)
		return
	isAutoOpened = true
	// No focus: the prompt keeps the keyboard. Ctrl+X Tab or a click focuses it to scroll.
	await $.ui.open({ id: PANE, title: "Work", columns: 64 })
	await summarizeIfMissing($)
}

// A conversation is resumed when it has turns no prompt of this process made:
// --resume and --continue load them before session.start, while the picker and
// an in-session /resume load them later, under a new session id.
async function checkResumed($: EngineInterface) {
	const id = await $.session.id()
	if (id !== watchedId) {
		watchedId = id
		// A /clear starts its conversation here, though the transcript's /clear row counts as a turn.
		hasPromptedHere = isClearPending
		isClearPending = false
		isAutoOpenWanted = false
		isAutoOpened = false
		// Another conversation now: its branches start over from here.
		sessionStartedAt = Date.now()
		await update($, branches, () => [])
	}
	if (isAutoOpenWanted || hasPromptedHere || (await $.session.turns()) === 0)
		return
	isAutoOpenWanted = true
	await autoOpen($)
}

function ago(at: number): string {
	const s = Math.max(0, Math.round((Date.now() - at) / 1000))
	if (s < 60) return `${s}s ago`
	if (s < 3600) return `${Math.round(s / 60)}m ago`
	return `${Math.round(s / 3600)}h ago`
}

const STATE_COLOR: Record<string, string> = {
	open: "success",
	draft: "subtle",
	merged: "merged",
	closed: "error",
	done: "success",
	resolved: "success",
	removed: "subtle",
	"to do": "subtle",
	new: "subtle",
	active: "suggestion",
	committed: "suggestion",
	"in progress": "suggestion",
}
const CHECKS: Record<CheckState, { text: string; color: string }> = {
	passing: { text: "✓ checks", color: "success" },
	failing: { text: "✗ checks", color: "error" },
	pending: { text: "● checks", color: "warning" },
	none: { text: "no checks", color: "subtle" },
}
const STEP: Record<Step["status"], { mark: string; color: string }> = {
	done: { mark: "✓", color: "success" },
	current: { mark: "●", color: "warning" },
	todo: { mark: "○", color: "subtle" },
}

export const register: Register = (on) => {
	on("session.start", async ($, e, next) => {
		await $.command.register({
			name: "work",
			description: "Show this session's PRs, work items and summary in a pane",
		})
		void checkResumed($)
		$.clock.every(5_000, () => checkResumed($))
		$.clock.every(60_000, async () => {
			if (await isPaneOpen($)) await refreshWork($)
		})

		return next(e)
	})

	on("turn.complete", async ($, e, next) => {
		const result = await next(e)
		if (e.agentId) return result
		// A main-conversation turn is when the session pushes branches and opens PRs,
		// and moves its goal and steps on.
		void (async () => {
			await noteBranch($)
			if (isAutoOpenWanted && !isAutoOpened) return autoOpen($)
			if (await isPaneOpen($)) await Promise.all([refreshWork($), summarize($)])
		})()

		return result
	})

	on("session.end", async (_$, e, next) => {
		if (e.reason === "clear") isClearPending = true

		return next(e)
	})

	on("prompt.submit", async (_$, e, next) => {
		hasPromptedHere = true

		return next(e)
	})

	on("command.run", { command: "work" }, async ($) => {
		// Opened by hand: auto-open has nothing left to do, so turns refresh the pane.
		isAutoOpened = true
		void refreshWork($)
		await $.ui.open({
			id: PANE,
			title: "Work",
			columns: 64,
			focus: true,
			closeOnEscape: true,
		})
		void summarizeIfMissing($)

		return {
			text: "Work pane opened. Up/Down or PgUp/PgDn scroll, Esc closes.",
		}
	})

	on("ui.render", { component: "Pane", requestId: PANE }, async ($, e) => {
		const { Box, Text, Link, Button } = $.ui.resolve(e)
		const current = await read($, work)
		const fetching = await read($, isFetching)
		const sum = await read($, summary)
		const summarizing = await read($, isSummarizing)
		const shut = await read($, collapsed)

		const toggle = (pr: Pr) =>
			update($, collapsed, (list) =>
				list.includes(pr.number)
					? list.filter((n) => n !== pr.number)
					: [...list, pr.number],
			)
		const prs = current?.prs ?? []
		const items = current?.items ?? []

		return (
			<Box flexDirection="column" rowGap={1}>
				<Box flexDirection="column">
					<Text>
						<Text bold color="planMode">
							Summary
						</Text>
						<Text dimColor>
							{summarizing ? " updating…" : sum ? ` ${ago(sum.at)}` : ""}
						</Text>
					</Text>
					{!sum && (
						<Text dimColor>Press Refresh to summarize this session.</Text>
					)}
					{sum && "error" in sum && <Text color="error">{sum.error}</Text>}
					{sum && "goal" in sum && <Text>{sum.goal}</Text>}
				</Box>

				{sum && "steps" in sum && sum.steps.length > 0 && (
					<Box flexDirection="column">
						<Text bold color="planMode">
							Steps
						</Text>
						{sum.steps.map((step) => (
							<Text
								wrap="truncate-end"
								color={
									step.status === "todo" ? undefined : STEP[step.status].color
								}
								dimColor={step.status === "todo"}
								bold={step.status === "current"}
							>
								{STEP[step.status].mark} {step.text}
							</Text>
						))}
					</Box>
				)}

				<Box flexDirection="column">
					<Text>
						<Text bold color="planMode">
							Pull requests
						</Text>
						<Text dimColor>
							{" "}
							{prs.length}
							{fetching ? " · updating…" : ""}
						</Text>
					</Text>
					{current?.error && <Text color="error">{current.error}</Text>}
					{prs.length === 0 && !current?.error && (
						<Text dimColor>None found for this session yet.</Text>
					)}
					{prs.map((pr) => (
						<Box flexDirection="column">
							<Box flexDirection="row" columnGap={1}>
								<Button
									key={`toggle-${pr.number}`}
									plain
									label={shut.includes(pr.number) ? "▸" : "▾"}
									onPress={() => void toggle(pr)}
								/>
								<Text wrap="truncate-end">
									<Link href={pr.url}>#{pr.number}</Link>
									<Text color={STATE_COLOR[pr.state] ?? "text"}>
										{" "}
										{pr.state}
									</Text>
									<Text dimColor> [{pr.branch}]</Text> {pr.title}
								</Text>
							</Box>
							{!shut.includes(pr.number) && (
								<Text>
									{"  "}
									{pr.review && (
										<Text
											color={pr.review === "approved" ? "success" : "warning"}
										>
											{pr.review}{" "}
										</Text>
									)}
									<Text color={CHECKS[pr.checks].color}>
										{CHECKS[pr.checks].text}
									</Text>
									<Text dimColor> {pr.comments} comments</Text>
								</Text>
							)}
						</Box>
					))}
				</Box>

				<Box flexDirection="column">
					<Text>
						<Text bold color="planMode">
							Work items
						</Text>
						<Text dimColor> {items.length}</Text>
					</Text>
					{items.length === 0 && <Text dimColor>None linked yet.</Text>}
					{items.map((item) => (
						<Text wrap="truncate-end">
							<Link href={item.url}>#{item.id}</Link>
							<Text color={STATE_COLOR[item.state] ?? "text"}>
								{" "}
								{item.state}
							</Text>{" "}
							{item.title}
						</Text>
					))}
				</Box>

				<Box flexDirection="row" columnGap={1}>
					<Button
						key="refresh"
						label="Refresh"
						hotkey="r"
						onPress={() => void Promise.all([refreshWork($), summarize($)])}
					/>
					<Text dimColor>
						{current
							? `PRs updated ${ago(current.fetchedAt)}`
							: "PRs not fetched yet"}
					</Text>
				</Box>
			</Box>
		)
	})
}
