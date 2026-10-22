import type { On, SessionMessage } from "claude-code"
import { expect, mock, test } from "claude-code/testing"

import {
	azureChecks,
	itemRefs,
	parseSummary,
	prNumbersIn,
} from "../hooks/discover"

const message = (text: string, output = ""): SessionMessage => ({
	role: "assistant",
	text,
	toolUses: [],
	toolResults: output
		? [{ tool_use_id: "t1", text: output, isError: false }]
		: [],
})

test("PR links count only when they point into this repository", async () => {
	const messages = [
		message(
			"see https://github.com/o/repo/pull/12",
			"https://github.com/o/repo/pull/7\n",
		),
		message("other repo https://github.com/o/elsewhere/pull/99"),
	]
	expect(prNumbersIn(messages, "github", "repo").sort()).toEqual([12, 7].sort())
	const azure = [
		message("https://dev.azure.com/org/proj/_git/My%20Repo/pullrequest/19668"),
	]
	expect(prNumbersIn(azure, "azure", "my repo")).toEqual([19668])
})

test("item refs come from the branch name and the branch commits", async () => {
	expect(
		itemRefs("azure", "user/me/43553/feat/x", "fix AB#44429 and AB#43553"),
	).toEqual([43553, 44429])
	expect(itemRefs("github", "41-fix-v2", "closes #8")).toEqual([41, 8])
	expect(itemRefs("github", "release/2.4", "")).toEqual([])
})

test("checks and summaries parse defensively", async () => {
	expect(azureChecks(["approved", "queued"])).toBe("pending")
	expect(azureChecks(["approved", "rejected"])).toBe("failing")
	expect(azureChecks([])).toBe("none")
	expect(
		parseSummary(
			'```json\n{"goal":"G","steps":[{"text":"a","status":"done"},{"text":"b","status":"weird"}]}\n```',
		),
	).toEqual({
		goal: "G",
		steps: [
			{ text: "a", status: "done" },
			{ text: "b", status: "todo" },
		],
	})
	expect(parseSummary("no json here")).toBeNull()
})

const GRAPHQL = JSON.stringify({
	data: {
		repository: {
			b0: {
				nodes: [
					{
						number: 7,
						title: "Add the thing",
						url: "https://github.com/o/repo/pull/7",
						state: "OPEN",
						isDraft: false,
						reviewDecision: "REVIEW_REQUIRED",
						headRefName: "feat/x",
						comments: { totalCount: 1 },
						reviewThreads: { totalCount: 2 },
						commits: {
							nodes: [{ commit: { statusCheckRollup: { state: "SUCCESS" } } }],
						},
						closingIssuesReferences: {
							nodes: [
								{
									number: 5,
									title: "The bug",
									url: "https://github.com/o/repo/issues/5",
									state: "OPEN",
								},
							],
						},
					},
				],
			},
			p12: {
				number: 12,
				title: "Stacked slice",
				url: "https://github.com/o/repo/pull/12",
				state: "MERGED",
				isDraft: false,
				reviewDecision: "APPROVED",
				headRefName: "feat/y",
				comments: { totalCount: 0 },
				reviewThreads: { totalCount: 0 },
				commits: { nodes: [{ commit: { statusCheckRollup: null } }] },
				closingIssuesReferences: { nodes: [] },
			},
		},
	},
})

const STDOUT: Record<string, string> = {
	"git remote": "git@github.com:o/repo.git\n",
	"git branch": "feat/x\n",
	"git symbolic-ref": "origin/main\n",
	"git log": "",
	"gh api": GRAPHQL,
}

function fakeWorld(
	on: On,
	opened: string[] = [],
	messages: SessionMessage[] = [
		message("opened https://github.com/o/repo/pull/12"),
	],
	stdout: (argv: readonly string[]) => string | undefined = () => undefined,
) {
	const prompts: string[] = []
	on("process.run", (_$, e) => ({
		value: {
			exitCode: 0,
			stdout: stdout(e.argv) ?? STDOUT[`${e.argv[0]} ${e.argv[1]}`] ?? "",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	}))
	on("session.messages", () => ({ value: messages }))
	on("model.complete", (_$, e) => {
		prompts.push(String(e.prompt))
		return {
			value: {
				isAnswered: true,
				text: '{"goal":"Ship the thing.","steps":[{"text":"Write it","status":"done"},{"text":"Review it","status":"current"},{"text":"Merge it","status":"todo"}]}',
				usage: {
					input_tokens: 1,
					output_tokens: 1,
					cache_read_input_tokens: 0,
					cache_creation_input_tokens: 0,
				},
			},
		}
	})
	on("ui.open", (_$, e) => {
		opened.push(e.id)
		return { value: { isPlaced: true } }
	})
	on("ui.panes", () => ({
		value: opened.map((id) => ({
			id,
			title: "Work",
			isShown: true,
			isFocused: false,
			isPlaced: true,
		})),
	}))
	on("command.register", (_$, e) => ({ value: { command: e.name } }))
	on("session.start", (_$, e) => ({ cwd: e.cwd }))
	return prompts
}

const PANE = {
	plugin: "work-pane",
	component: "Pane",
	requestId: "work-pane",
	props: {
		title: "Work",
		isFocused: true,
		bodyColumns: 64,
		placement: "dock",
		scroll: { offset: 0, bodyRows: 30 },
		view: {},
	},
} as const

test("Refresh fills PRs, items and the summary, each PR linked", async ($, on) => {
	const prompts = fakeWorld(on)
	const first = await $.ui.mount({ ...PANE, surface: "terminal" })
	expect(
		await first.find({ type: "Text", text: /Press Refresh/ }),
	).toBeDefined()
	await first.unmount()

	for (const surface of ["terminal", "desktop"] as const) {
		const ui = await $.ui.mount({ ...PANE, surface })
		await ui.press({ key: "refresh" })

		const links = await ui.findAll({ type: "Link" })
		expect(links.map((link) => link.props.href)).toEqual([
			"https://github.com/o/repo/pull/7",
			"https://github.com/o/repo/pull/12",
			"https://github.com/o/repo/issues/5",
		])
		expect(
			await ui.find({ type: "Text", text: /review required/ }),
		).toBeDefined()
		expect(await ui.find({ type: "Text", text: /3 comments/ })).toBeDefined()
		expect(
			await ui.find({ type: "Text", text: /Ship the thing\./ }),
		).toBeDefined()
		expect(await ui.find({ type: "Text", text: /● Review it/ })).toBeDefined()
		expect(await ui.find({ type: "Text", text: /○ Merge it/ })).toBeDefined()
		expect(
			await ui.find({ type: "Text", text: /^PRs updated \d+s ago$/ }),
		).toBeDefined()

		await ui.press({ key: "toggle-7" })
		expect(await ui.find({ type: "Text", text: /3 comments/ })).toBeUndefined()
		await ui.press({ key: "toggle-7" })
		await ui.unmount()
	}
	expect(prompts.length).toBe(2)
	expect(prompts[0]).toContain("pull/12")
})

test("Refresh skips the model while the session has no messages", async ($, on) => {
	const prompts = fakeWorld(on, [], [])
	const ui = await $.ui.mount({ ...PANE, surface: "terminal" })
	await ui.press({ key: "refresh" })
	expect(prompts).toEqual([])
	expect(
		await ui.find({ type: "Text", text: /Nothing to summarize yet/ }),
	).toBeDefined()
	await ui.unmount()
})

function fakeSession(on: On, start: { id: string; turns: number }) {
	const session = { ...start }
	on("session.id", () => ({ value: session.id }))
	on("session.turns", () => ({ value: session.turns }))
	return session
}

const START = {
	cwd: "/repo",
	surface: "terminal",
	isInteractive: true,
} as const

test("a branch the session only started on drops off; one it committed to stays", async ($, on) => {
	let branch = "old-pr"
	const queried: string[][] = []
	const committedTo = new Set<string>()
	fakeWorld(on, [], [], (argv) => {
		if (argv[0] === "git" && argv[1] === "branch") return `${branch}\n`
		if (argv[0] === "git" && argv[1] === "log" && argv[2] === "-1")
			return committedTo.has(argv.at(-1) ?? "") ? "abc\n" : ""
		if (argv[0] === "gh") queried.push(argv.filter((arg) => /^b\d+=/.test(arg)))
		return undefined
	})
	const ui = await $.ui.mount({ ...PANE, surface: "terminal" })
	await ui.press({ key: "refresh" })
	expect(queried.at(-1)).toEqual(["b0=old-pr"])

	branch = "stacked"
	committedTo.add("stacked")
	await ui.press({ key: "refresh" })
	branch = "new-feature"
	await ui.press({ key: "refresh" })
	expect(queried.at(-1)).toEqual(["b0=new-feature", "b1=stacked"])
	await ui.unmount()
})

test("a new session never opens the pane by itself, even after its own turns", async ($, on) => {
	const clock = mock.clock(on)
	const opened: string[] = []
	fakeWorld(on, opened)
	const session = fakeSession(on, { id: "a", turns: 0 })
	on("prompt.submit", (_$, e) => ({ text: e.text }))
	await $.session.start(START)
	await clock.settle()
	await $.prompt.submit({
		text: "hi",
		wait: false,
		origin: { kind: "composer" },
	})
	session.turns = 1
	await clock.advance(10_000)
	expect(opened).toEqual([])
	await $.command.run({ command: "work", args: "" })
	await clock.settle()
	expect(opened).toEqual(["work-pane"])
})

test("--resume opens the pane at start and summarizes once", async ($, on) => {
	const clock = mock.clock(on)
	const opened: string[] = []
	const prompts = fakeWorld(on, opened)
	fakeSession(on, { id: "a", turns: 4 })
	await $.session.start(START)
	await clock.settle()
	expect(opened).toEqual(["work-pane"])
	expect(prompts.length).toBe(1)
	await clock.advance(10_000)
	expect(opened).toEqual(["work-pane"])
})

test("the picker and /resume open the pane once the resumed turns load", async ($, on) => {
	const clock = mock.clock(on)
	const opened: string[] = []
	fakeWorld(on, opened)
	const session = fakeSession(on, { id: "picker", turns: 0 })
	await $.session.start(START)
	await clock.settle()
	expect(opened).toEqual([])
	session.id = "resumed"
	session.turns = 6
	await clock.advance(5_000)
	expect(opened).toEqual(["work-pane"])
})

test("each turn summarizes again while the pane is open, not once it closes", async ($, on) => {
	const clock = mock.clock(on)
	const opened = ["work-pane"]
	const prompts = fakeWorld(on, opened)
	on("turn.complete", (_$, e) => ({ text: e.answer }))
	const turn = {
		answer: "",
		durationMs: 1,
		isAborted: false,
		reason: "answer",
	} as const
	await $.turn.complete({ ...turn, turnId: "t1" })
	await clock.settle()
	await $.turn.complete({ ...turn, turnId: "t2" })
	await clock.settle()
	expect(prompts.length).toBe(2)
	opened.length = 0
	await $.turn.complete({ ...turn, turnId: "t3" })
	await clock.settle()
	expect(prompts.length).toBe(2)
})

test("a resumed session with nothing to show still opens the pane and summarizes each turn", async ($, on) => {
	const clock = mock.clock(on)
	const opened: string[] = []
	const prompts = fakeWorld(on, opened, [message("hello")], (argv) =>
		argv[0] === "gh" ? '{"data":{"repository":{}}}' : undefined,
	)
	on("turn.complete", (_$, e) => ({ text: e.answer }))
	fakeSession(on, { id: "a", turns: 4 })
	await $.session.start(START)
	await clock.settle()
	expect(opened).toEqual(["work-pane"])
	const before = prompts.length
	await $.turn.complete({
		answer: "",
		durationMs: 1,
		isAborted: false,
		reason: "answer",
		turnId: "t1",
	})
	await clock.settle()
	expect(prompts.length).toBe(before + 1)
})

test("/clear neither opens the pane nor summarizes the cleared conversation", async ($, on) => {
	const clock = mock.clock(on)
	const opened: string[] = []
	const prompts = fakeWorld(on, opened, [message("/clear")])
	on("session.end", (_$, e) => ({ sessionId: e.sessionId }))
	const session = fakeSession(on, { id: "a", turns: 0 })
	await $.session.start(START)
	await clock.settle()
	await $.session.end({ reason: "clear", sessionId: "a", resume: { id: "a" } })
	// The cleared transcript opens with the /clear command row, a user turn.
	session.id = "b"
	session.turns = 1
	await clock.advance(10_000)
	expect(opened).toEqual([])
	expect(prompts).toEqual([])
})
