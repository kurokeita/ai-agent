import os from "node:os"
import { describe, expect, it, vi } from "vitest"
import { describeRefusal, isInsideGitWorkTree, resolveScope } from "../scope.js"

describe("src/utils/scope.ts", () => {
	describe("resolveScope (global)", () => {
		it("always succeeds with the homedir as root", () => {
			const result = resolveScope("global", {
				cwd: "/anywhere",
				homedir: "/home/me",
			})
			expect(result).toEqual({
				ok: true,
				scope: "global",
				root: "/home/me",
			})
		})

		it("does not invoke the git check for global scope", () => {
			const gitCheck = vi.fn(() => false)
			resolveScope("global", {
				cwd: "/anywhere",
				homedir: "/home/me",
				gitCheck,
			})
			expect(gitCheck).not.toHaveBeenCalled()
		})
	})

	describe("resolveScope (project)", () => {
		it("succeeds when inside a git repo and not at homedir", () => {
			const result = resolveScope("project", {
				cwd: "/home/me/dev/myrepo/packages/api",
				homedir: "/home/me",
				gitCheck: () => true,
			})
			expect(result).toEqual({
				ok: true,
				scope: "project",
				root: "/home/me/dev/myrepo/packages/api",
			})
		})

		it("refuses when cwd equals the homedir", () => {
			const result = resolveScope("project", {
				cwd: "/home/me",
				homedir: "/home/me",
				gitCheck: () => true,
			})
			expect(result).toEqual({ ok: false, reason: "homedir" })
		})

		it("refuses when not inside a git work tree", () => {
			const result = resolveScope("project", {
				cwd: "/tmp/scratch",
				homedir: "/home/me",
				gitCheck: () => false,
			})
			expect(result).toEqual({ ok: false, reason: "not-a-git-repo" })
		})

		it("uses os.homedir() and process.cwd() defaults", () => {
			const result = resolveScope("project", {
				gitCheck: () => true,
			})
			if (!result.ok) {
				throw new Error("expected resolution to succeed")
			}
			expect(result.root).toBe(process.cwd())
			expect(result.scope).toBe("project")
		})

		it("short-circuits with homedir refusal before git check", () => {
			const gitCheck = vi.fn(() => true)
			resolveScope("project", {
				cwd: os.homedir(),
				homedir: os.homedir(),
				gitCheck,
			})
			expect(gitCheck).not.toHaveBeenCalled()
		})
	})

	describe("isInsideGitWorkTree", () => {
		it("returns false outside any git repo", () => {
			expect(isInsideGitWorkTree(os.tmpdir())).toBe(false)
		})

		it("returns true inside this repo", () => {
			expect(isInsideGitWorkTree(process.cwd())).toBe(true)
		})
	})

	describe("describeRefusal", () => {
		it("returns a homedir message", () => {
			expect(describeRefusal("homedir")).toMatch(/home directory/i)
		})

		it("returns a git-repo message", () => {
			expect(describeRefusal("not-a-git-repo")).toMatch(/git repository/i)
		})
	})
})
