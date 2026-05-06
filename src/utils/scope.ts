import { execFileSync } from "node:child_process"
import os from "node:os"

import type { Scope } from "./paths"

export type ScopeRefusalReason = "homedir" | "not-a-git-repo"

export type ScopeResolution =
	| { ok: true; scope: Scope; root: string }
	| { ok: false; reason: ScopeRefusalReason }

export function isInsideGitWorkTree(cwd: string): boolean {
	try {
		const out = execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
			cwd,
			stdio: ["ignore", "pipe", "ignore"],
			encoding: "utf-8",
		})
		return out.trim() === "true"
	} catch {
		return false
	}
}

export interface ResolveScopeOptions {
	cwd?: string
	homedir?: string
	gitCheck?: (cwd: string) => boolean
}

export function resolveScope(
	scope: Scope,
	options: ResolveScopeOptions = {},
): ScopeResolution {
	const cwd = options.cwd ?? process.cwd()

	if (scope === "global") {
		return { ok: true, scope: "global", root: options.homedir ?? os.homedir() }
	}

	const home = options.homedir ?? os.homedir()
	if (cwd === home) {
		return { ok: false, reason: "homedir" }
	}

	const gitCheck = options.gitCheck ?? isInsideGitWorkTree
	if (!gitCheck(cwd)) {
		return { ok: false, reason: "not-a-git-repo" }
	}

	return { ok: true, scope: "project", root: cwd }
}

export function describeRefusal(reason: ScopeRefusalReason): string {
	switch (reason) {
		case "homedir":
			return "Project scope is not allowed when the current directory is your home directory."
		case "not-a-git-repo":
			return "Project scope requires running inside a git repository."
	}
}
