import type { Item, Pr, Work } from "../types"
import {
	azureChecks,
	azureReview,
	githubChecks,
	itemRefs,
	type Platform,
} from "./discover"

// Runs a command; register.tsx supplies it, since only that file may use $.
export type Run = (
	argv: string[],
) => Promise<{ exitCode: number; stdout: string; stderr: string }>

export async function git(run: Run, args: string[]): Promise<string> {
	const { exitCode, stdout } = await run(["git", ...args])
	return exitCode === 0 ? stdout.trim() : ""
}

function firstLine(text: string): string {
	return text.trim().split("\n")[0] ?? ""
}

async function refsByBranch(
	run: Run,
	platform: Platform,
	branches: readonly string[],
) {
	const base = await git(run, [
		"symbolic-ref",
		"--short",
		"refs/remotes/origin/HEAD",
	])
	const refs = new Map<string, number[]>()
	for (const branch of branches) {
		const log = base
			? await git(run, ["log", "--format=%B", `${base}..${branch}`])
			: ""
		refs.set(branch, itemRefs(platform, branch, log))
	}
	return refs
}

const PR_FIELDS = `number title url state isDraft reviewDecision headRefName
  comments { totalCount } reviewThreads { totalCount }
  commits(last: 1) { nodes { commit { statusCheckRollup { state } } } }
  closingIssuesReferences(first: 10) { nodes { number title url state } }`

type GhIssue = { number: number; title: string; url: string; state: string }
type GhPr = {
	number: number
	title: string
	url: string
	state: string
	isDraft: boolean
	reviewDecision: string | null
	headRefName: string
	comments: { totalCount: number }
	reviewThreads: { totalCount: number }
	commits: {
		nodes: { commit: { statusCheckRollup: { state: string } | null } }[]
	}
	closingIssuesReferences: { nodes: GhIssue[] }
}

const ghItem = (issue: GhIssue): Item => ({
	id: issue.number,
	url: issue.url,
	title: issue.title,
	state: issue.state.toLowerCase(),
})

// One GraphQL call: each branch's newest PR, each PR the conversation linked,
// and every item ref, as aliases. Branch names go in as variables, never into
// the query text. gh exits 1 when an alias does not resolve yet still prints
// the rest, so success is judged by data.repository.
export async function fetchGitHub(
	run: Run,
	branches: readonly string[],
	prNumbers: readonly number[],
): Promise<Work> {
	const refs = await refsByBranch(run, "github", branches)
	const vars: string[] = []
	const fields: string[] = []
	const args: string[] = []
	branches.forEach((branch, i) => {
		vars.push(`, $b${i}: String!`)
		args.push("-f", `b${i}=${branch}`)
		fields.push(`b${i}: pullRequests(headRefName: $b${i}, first: 1, states: [OPEN, MERGED, CLOSED],
      orderBy: {field: CREATED_AT, direction: DESC}) { nodes { ...P } }`)
	})
	for (const n of prNumbers)
		fields.push(`p${n}: pullRequest(number: ${n}) { ...P }`)
	for (const n of new Set([...refs.values()].flat())) {
		fields.push(
			`i${n}: issueOrPullRequest(number: ${n}) { ... on Issue { number title url state } }`,
		)
	}
	if (fields.length === 0) return { prs: [], items: [], fetchedAt: Date.now() }
	const query = `query($owner: String!, $name: String!${vars.join("")}) {
    repository(owner: $owner, name: $name) { ${fields.join("\n")} }
  } fragment P on PullRequest { ${PR_FIELDS} }`
	const out = await run([
		"gh",
		"api",
		"graphql",
		"-F",
		"owner={owner}",
		"-F",
		"name={repo}",
		...args,
		"-f",
		`query=${query}`,
	])
	let repo: Record<string, unknown> | undefined
	try {
		repo = (
			JSON.parse(out.stdout) as {
				data?: { repository?: Record<string, unknown> }
			}
		).data?.repository
	} catch {
		repo = undefined
	}
	if (!repo)
		return {
			prs: [],
			items: [],
			fetchedAt: Date.now(),
			error: `gh: ${firstLine(out.stderr) || "no data"}`,
		}

	const prs = new Map<number, Pr>()
	const items = new Map<number, Item>()
	const addPr = (pr: GhPr) => {
		prs.set(pr.number, {
			number: pr.number,
			url: pr.url,
			title: pr.title,
			branch: pr.headRefName,
			state:
				pr.isDraft && pr.state === "OPEN" ? "draft" : pr.state.toLowerCase(),
			review: (pr.reviewDecision ?? "").toLowerCase().replace(/_/g, " "),
			checks: githubChecks(
				pr.commits.nodes[0]?.commit.statusCheckRollup?.state,
			),
			comments: pr.comments.totalCount + pr.reviewThreads.totalCount,
		})
		for (const issue of pr.closingIssuesReferences.nodes)
			items.set(issue.number, ghItem(issue))
	}
	branches.forEach((branch, i) => {
		const pr = (repo[`b${i}`] as { nodes: GhPr[] } | null)?.nodes[0]
		if (pr) {
			addPr(pr)
			return
		}
		for (const n of refs.get(branch) ?? []) {
			const issue = repo[`i${n}`] as GhIssue | null
			if (issue?.number) items.set(issue.number, ghItem(issue))
		}
	})
	for (const n of prNumbers) {
		const pr = repo[`p${n}`] as GhPr | null
		if (pr) addPr(pr)
	}
	return {
		prs: [...prs.values()],
		items: [...items.values()],
		fetchedAt: Date.now(),
	}
}

async function az(run: Run, args: string[]): Promise<unknown> {
	const out = await run(["az", ...args, "--only-show-errors", "-o", "json"])
	if (out.exitCode !== 0) return null
	try {
		return JSON.parse(out.stdout)
	} catch {
		return null
	}
}

type AzPr = {
	pullRequestId: number
	title: string
	status: string
	isDraft: boolean
	url: string
	sourceRefName: string
	reviewers?: { vote: number }[]
	repository: { id: string; project: { id: string } }
}
type AzWorkItem = { id: number; url: string; fields: Record<string, string> }

const AZ_STATE: Record<string, string> = {
	active: "open",
	completed: "merged",
	abandoned: "closed",
}

const azItem = (w: AzWorkItem): Item => ({
	id: w.id,
	url: w.url.replace("/_apis/wit/workItems/", "/_workitems/edit/"),
	title: w.fields["System.Title"] ?? "",
	state: (w.fields["System.State"] ?? "").toLowerCase(),
})

// One az call per lookup, run in parallel: each branch's newest PR, each linked
// PR, then each PR's work items, blocking policies (its checks) and threads.
export async function fetchAzure(
	run: Run,
	branches: readonly string[],
	prNumbers: readonly number[],
): Promise<Work> {
	const refs = await refsByBranch(run, "azure", branches)
	const byBranch = await Promise.all(
		branches.map((b) =>
			az(run, [
				"repos",
				"pr",
				"list",
				"--source-branch",
				b,
				"--status",
				"all",
				"--top",
				"1",
			]),
		),
	)
	const byNumber = await Promise.all(
		prNumbers.map((n) => az(run, ["repos", "pr", "show", "--id", String(n)])),
	)
	if (
		[...byBranch, ...byNumber].length > 0 &&
		[...byBranch, ...byNumber].every((r) => r === null)
	) {
		return {
			prs: [],
			items: [],
			fetchedAt: Date.now(),
			error: "az: every lookup failed (logged in?)",
		}
	}

	const raw = new Map<number, AzPr>()
	const refsWithoutPr: number[] = []
	byBranch.forEach((list, i) => {
		const pr = (list as AzPr[] | null)?.[0]
		if (pr) raw.set(pr.pullRequestId, pr)
		else refsWithoutPr.push(...(refs.get(branches[i] ?? "") ?? []))
	})
	for (const pr of byNumber as (AzPr | null)[])
		if (pr) raw.set(pr.pullRequestId, pr)

	const items = new Map<number, Item>()
	const prs = await Promise.all(
		[...raw.values()].map(async (pr): Promise<Pr> => {
			const id = String(pr.pullRequestId)
			const [workItems, policies, threads] = await Promise.all([
				az(run, ["repos", "pr", "work-item", "list", "--id", id]),
				az(run, ["repos", "pr", "policy", "list", "--id", id]),
				az(run, [
					"devops",
					"invoke",
					"--area",
					"git",
					"--resource",
					"pullRequestThreads",
					"--api-version",
					"7.1",
					"--route-parameters",
					`project=${pr.repository.project.id}`,
					`repositoryId=${pr.repository.id}`,
					`pullRequestId=${id}`,
				]),
			])
			for (const w of (workItems as AzWorkItem[] | null) ?? [])
				items.set(w.id, azItem(w))
			const blocking = (
				(policies as
					| { status: string; configuration: { isBlocking: boolean } }[]
					| null) ?? []
			)
				.filter((p) => p.configuration.isBlocking)
				.map((p) => p.status)
			const comments = (
				(
					threads as {
						value?: {
							isDeleted: boolean
							comments: { commentType: string }[]
						}[]
					} | null
				)?.value ?? []
			).filter(
				(t) => !t.isDeleted && t.comments[0]?.commentType === "text",
			).length
			return {
				number: pr.pullRequestId,
				url: pr.url
					.replace("/_apis/git/repositories/", "/_git/")
					.replace("/pullRequests/", "/pullrequest/"),
				title: pr.title,
				branch: pr.sourceRefName.replace(/^refs\/heads\//, ""),
				state:
					pr.isDraft && pr.status === "active"
						? "draft"
						: (AZ_STATE[pr.status] ?? pr.status),
				review: azureReview((pr.reviewers ?? []).map((r) => r.vote)),
				checks: azureChecks(blocking),
				comments,
			}
		}),
	)

	const missing = [...new Set(refsWithoutPr)].filter((n) => !items.has(n))
	if (missing.length > 0) {
		const wiql = `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.Id] IN (${missing.join(", ")})`
		for (const w of ((await az(run, ["boards", "query", "--wiql", wiql])) as
			| AzWorkItem[]
			| null) ?? [])
			items.set(w.id, azItem(w))
	}
	return { prs, items: [...items.values()], fetchedAt: Date.now() }
}
