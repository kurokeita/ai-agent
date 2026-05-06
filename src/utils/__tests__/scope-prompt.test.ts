import * as prompts from "@clack/prompts"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	chooseInstallScope,
	chooseListRemoveScope,
	isValidListRemoveScopeFlag,
	isValidScopeFlag,
} from "../scope-prompt.js"

vi.mock("@clack/prompts")

describe("isValidScopeFlag", () => {
	it("accepts global and project", () => {
		expect(isValidScopeFlag("global")).toBe(true)
		expect(isValidScopeFlag("project")).toBe(true)
	})

	it("rejects everything else", () => {
		expect(isValidScopeFlag("both")).toBe(false)
		expect(isValidScopeFlag(undefined)).toBe(false)
		expect(isValidScopeFlag("")).toBe(false)
	})
})

describe("chooseInstallScope", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.mocked(prompts.isCancel).mockReturnValue(false)
	})

	it("uses the flag and skips the prompt for global", async () => {
		const result = await chooseInstallScope({
			flag: "global",
			homedir: "/home/me",
			cwd: "/home/me/dev/x",
			gitCheck: () => true,
		})
		expect(prompts.select).not.toHaveBeenCalled()
		expect(result).toEqual({
			cancelled: false,
			scope: "global",
			root: "/home/me",
		})
	})

	it("uses the flag and skips the prompt for project when guards pass", async () => {
		const result = await chooseInstallScope({
			flag: "project",
			homedir: "/home/me",
			cwd: "/home/me/dev/x",
			gitCheck: () => true,
		})
		expect(prompts.select).not.toHaveBeenCalled()
		expect(result).toEqual({
			cancelled: false,
			scope: "project",
			root: "/home/me/dev/x",
		})
	})

	it("returns cancelled when --scope project fails the guard (no fallback prompt)", async () => {
		const result = await chooseInstallScope({
			flag: "project",
			homedir: "/home/me",
			cwd: "/tmp/scratch",
			gitCheck: () => false,
		})
		expect(prompts.note).toHaveBeenCalled()
		expect(prompts.select).not.toHaveBeenCalled()
		expect(result).toEqual({ cancelled: true })
	})

	it("prompts the user when no flag is given", async () => {
		vi.mocked(prompts.select).mockResolvedValueOnce("global")
		const result = await chooseInstallScope({
			homedir: "/home/me",
			cwd: "/home/me/dev/x",
			gitCheck: () => true,
		})
		expect(prompts.select).toHaveBeenCalled()
		expect(result).toEqual({
			cancelled: false,
			scope: "global",
			root: "/home/me",
		})
	})

	it("returns cancelled when the scope prompt is cancelled", async () => {
		vi.mocked(prompts.select).mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockReturnValueOnce(true)
		const result = await chooseInstallScope({
			homedir: "/home/me",
			cwd: "/home/me/dev/x",
			gitCheck: () => true,
		})
		expect(result).toEqual({ cancelled: true })
	})

	it("offers global fallback when project guard fails after a prompt", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("project")
			.mockResolvedValueOnce("global")
		const result = await chooseInstallScope({
			homedir: "/home/me",
			cwd: "/tmp/scratch",
			gitCheck: () => false,
		})
		expect(prompts.note).toHaveBeenCalledWith(
			expect.stringMatching(/git repository/i),
			"Project scope unavailable",
		)
		expect(result).toEqual({
			cancelled: false,
			scope: "global",
			root: "/home/me",
		})
	})

	it("returns cancelled when the user cancels the global fallback", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("project")
			.mockResolvedValueOnce("cancel")
		const result = await chooseInstallScope({
			homedir: "/home/me",
			cwd: "/tmp/scratch",
			gitCheck: () => false,
		})
		expect(result).toEqual({ cancelled: true })
	})

	it("returns cancelled when the fallback select itself is cancelled", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("project")
			.mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel)
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true)
		const result = await chooseInstallScope({
			homedir: "/home/me",
			cwd: "/tmp/scratch",
			gitCheck: () => false,
		})
		expect(result).toEqual({ cancelled: true })
	})

	it("refuses project at homedir and offers fallback", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("project")
			.mockResolvedValueOnce("global")
		const result = await chooseInstallScope({
			homedir: "/home/me",
			cwd: "/home/me",
			gitCheck: () => true,
		})
		expect(prompts.note).toHaveBeenCalledWith(
			expect.stringMatching(/home directory/i),
			"Project scope unavailable",
		)
		expect(result).toEqual({
			cancelled: false,
			scope: "global",
			root: "/home/me",
		})
	})
})

describe("isValidListRemoveScopeFlag", () => {
	it("accepts global, project, both", () => {
		expect(isValidListRemoveScopeFlag("global")).toBe(true)
		expect(isValidListRemoveScopeFlag("project")).toBe(true)
		expect(isValidListRemoveScopeFlag("both")).toBe(true)
	})
	it("rejects everything else", () => {
		expect(isValidListRemoveScopeFlag("bogus")).toBe(false)
		expect(isValidListRemoveScopeFlag(undefined)).toBe(false)
	})
})

describe("chooseListRemoveScope", () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.mocked(prompts.isCancel).mockReturnValue(false)
	})

	it("uses the flag and skips prompt for global", async () => {
		const result = await chooseListRemoveScope({
			action: "list",
			flag: "global",
			homedir: "/home/me",
			cwd: "/home/me/dev/x",
			gitCheck: () => true,
		})
		expect(prompts.select).not.toHaveBeenCalled()
		expect(result).toEqual({
			cancelled: false,
			scope: "global",
			homedir: "/home/me",
		})
	})

	it("uses the flag for project when guards pass", async () => {
		const result = await chooseListRemoveScope({
			action: "list",
			flag: "project",
			homedir: "/home/me",
			cwd: "/home/me/dev/x",
			gitCheck: () => true,
		})
		expect(result).toEqual({
			cancelled: false,
			scope: "project",
			homedir: "/home/me",
			projectRoot: "/home/me/dev/x",
		})
	})

	it("uses the flag for both when guards pass", async () => {
		const result = await chooseListRemoveScope({
			action: "list",
			flag: "both",
			homedir: "/home/me",
			cwd: "/home/me/dev/x",
			gitCheck: () => true,
		})
		expect(result).toEqual({
			cancelled: false,
			scope: "both",
			homedir: "/home/me",
			projectRoot: "/home/me/dev/x",
		})
	})

	it("returns cancelled when --scope project fails the guard", async () => {
		const result = await chooseListRemoveScope({
			action: "list",
			flag: "project",
			homedir: "/home/me",
			cwd: "/tmp/scratch",
			gitCheck: () => false,
		})
		expect(prompts.select).not.toHaveBeenCalled()
		expect(result).toEqual({ cancelled: true })
	})

	it("offers global-only fallback when prompted project guard fails", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("project")
			.mockResolvedValueOnce("global")
		const result = await chooseListRemoveScope({
			action: "list",
			homedir: "/home/me",
			cwd: "/tmp/scratch",
			gitCheck: () => false,
		})
		expect(prompts.note).toHaveBeenCalled()
		expect(result).toEqual({
			cancelled: false,
			scope: "global",
			homedir: "/home/me",
		})
	})

	it("returns cancelled when fallback is declined", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("project")
			.mockResolvedValueOnce("cancel")
		const result = await chooseListRemoveScope({
			action: "remove",
			homedir: "/home/me",
			cwd: "/tmp/scratch",
			gitCheck: () => false,
		})
		expect(result).toEqual({ cancelled: true })
	})

	it("returns cancelled when scope select is cancelled", async () => {
		vi.mocked(prompts.select).mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel).mockReturnValueOnce(true)
		const result = await chooseListRemoveScope({
			action: "list",
			homedir: "/home/me",
			cwd: "/home/me/dev/x",
			gitCheck: () => true,
		})
		expect(result).toEqual({ cancelled: true })
	})

	it("returns cancelled when fallback select is cancelled", async () => {
		vi.mocked(prompts.select)
			.mockResolvedValueOnce("project")
			.mockResolvedValueOnce(Symbol("cancel"))
		vi.mocked(prompts.isCancel)
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true)
		const result = await chooseListRemoveScope({
			action: "list",
			homedir: "/home/me",
			cwd: "/tmp/scratch",
			gitCheck: () => false,
		})
		expect(result).toEqual({ cancelled: true })
	})
})
