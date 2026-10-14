export type CheckState = "passing" | "failing" | "pending" | "none"
export type Pr = {
	number: number
	url: string
	title: string
	branch: string
	state: string
	review: string
	checks: CheckState
	comments: number
}
export type Item = { id: number; url: string; title: string; state: string }
export type Work = {
	prs: Pr[]
	items: Item[]
	fetchedAt: number
	error?: string
}
export type Step = { text: string; status: "done" | "current" | "todo" }
export type Summary =
	| { goal: string; steps: Step[]; at: number }
	| { error: string; at: number }

declare module "claude-code" {
	interface PluginState {
		"work-items": {
			branches: string[]
			work: Work | null
			isFetching: boolean
			summary: Summary | null
			isSummarizing: boolean
			collapsed: number[]
		}
	}
}
