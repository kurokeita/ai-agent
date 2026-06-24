import { execFileSync } from "node:child_process"
import os from "node:os"
import path from "node:path"
import fs from "fs-extra"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	buildClaudeCodeEntry,
	buildCodexBlock,
	buildCopilotEntry,
	buildGeminiEntry,
	buildLinkMap,
	codexBlockAlreadyPresent,
	detectConflicts,
	dropAgentsEntry,
	installAgentSetupScripts,
	mergeConflicts,
	mergeJsonSessionStart,
	presentLinkSubdirs,
	removeAgentDirEntries,
	runAgentSetupScript,
	wireAgentSetup,
	wireSessionStartHooks,
} from "../agent-setup.js"

describe("agent-setup merge helpers", () => {
	describe("mergeJsonSessionStart", () => {
		it("creates the hooks object on an empty config", () => {
			const entry = buildClaudeCodeEntry("/x/agent-setup.sh")
			const merged = mergeJsonSessionStart({}, "SessionStart", entry)
			expect(merged.hooks).toEqual({ SessionStart: [entry] })
		})

		it("appends without overwriting sibling keys", () => {
			const existing = {
				model: "opus",
				hooks: { PreToolUse: [{ a: 1 }] },
			}
			const entry = buildGeminiEntry("/x/agent-setup.sh")
			const merged = mergeJsonSessionStart(existing, "SessionStart", entry)
			expect(merged.model).toBe("opus")
			expect((merged.hooks as Record<string, unknown>).PreToolUse).toEqual([
				{ a: 1 },
			])
			expect((merged.hooks as Record<string, unknown>).SessionStart).toEqual([
				entry,
			])
		})

		it("is idempotent for an identical entry", () => {
			const entry = buildCopilotEntry("/x/agent-setup.sh")
			const once = mergeJsonSessionStart({}, "sessionStart", entry)
			const twice = mergeJsonSessionStart(once, "sessionStart", entry)
			expect(
				(twice.hooks as Record<string, unknown[]>).sessionStart,
			).toHaveLength(1)
		})

		it("appends a distinct entry alongside an existing one", () => {
			const a = buildClaudeCodeEntry("/a.sh")
			const b = buildClaudeCodeEntry("/b.sh")
			const merged = mergeJsonSessionStart(
				mergeJsonSessionStart({}, "SessionStart", a),
				"SessionStart",
				b,
			)
			expect(
				(merged.hooks as Record<string, unknown[]>).SessionStart,
			).toHaveLength(2)
		})

		it("replaces a non-array hook value with an array", () => {
			const existing = { hooks: { SessionStart: "bad" } }
			const entry = buildClaudeCodeEntry("/x.sh")
			const merged = mergeJsonSessionStart(existing, "SessionStart", entry)
			expect((merged.hooks as Record<string, unknown[]>).SessionStart).toEqual([
				entry,
			])
		})
	})

	describe("codex block", () => {
		it("builds a SessionStart TOML block with the quoted command", () => {
			const block = buildCodexBlock("/x/agent-setup.sh")
			expect(block).toContain("[[hooks.SessionStart]]")
			expect(block).toContain('command = "/x/agent-setup.sh"')
		})

		it("detects an already-present command", () => {
			const block = buildCodexBlock("/x/agent-setup.sh")
			expect(codexBlockAlreadyPresent(block, "/x/agent-setup.sh")).toBe(true)
			expect(codexBlockAlreadyPresent(block, "/other.sh")).toBe(false)
		})
	})

	describe("buildLinkMap", () => {
		it("emits SRC_SUBDIR|DEST lines per platform for global scope", () => {
			const map = buildLinkMap("global", os.homedir(), ["skills"])
			const lines = map.split("\n")
			expect(lines.every((l) => l.startsWith("skills|"))).toBe(true)
			expect(lines.some((l) => l.includes(".claude/skills"))).toBe(true)
		})

		it("only includes present subdirs", () => {
			const map = buildLinkMap("global", os.homedir(), ["commands"])
			expect(map).not.toContain("skills|")
			expect(map).toContain("commands|")
		})

		it("uses project-relative dest dirs for project scope", () => {
			const map = buildLinkMap("project", "/repo", ["agents"])
			expect(map).toContain("agents|.claude/agents")
		})

		it("dedupes collapsed dest dirs (codex)", () => {
			const map = buildLinkMap("global", os.homedir(), [
				"skills",
				"agents",
				"commands",
			])
			const codexLines = map
				.split("\n")
				.filter((l) => l.includes(".codex/skills"))
			const unique = new Set(codexLines)
			expect(unique.size).toBe(codexLines.length)
		})

		it("returns an empty string when no subdirs are present", () => {
			expect(buildLinkMap("global", os.homedir(), [])).toBe("")
		})

		it("restricts dest dirs to the selected platforms", () => {
			const map = buildLinkMap(
				"global",
				os.homedir(),
				["skills"],
				["claude-code"],
			)
			expect(map).toContain(".claude/skills")
			expect(map).not.toContain(".gemini/skills")
		})
	})

	describe("mergeConflicts", () => {
		it("returns platform conflicts as-is when there are no pre-existing", () => {
			const merged = mergeConflicts(
				[{ entry: "a", subdir: "skills", targetPaths: ["/p/a"] }],
				[],
			)
			expect(merged).toEqual([
				{ entry: "a", subdir: "skills", targetPaths: ["/p/a"] },
			])
		})

		it("adds a pre-existing-only entry with empty targetPaths", () => {
			const merged = mergeConflicts([], [{ entry: "b", subdir: "agents" }])
			expect(merged).toEqual([
				{ entry: "b", subdir: "agents", targetPaths: [] },
			])
		})

		it("merges an entry present in both, keeping the platform targetPaths", () => {
			const merged = mergeConflicts(
				[{ entry: "c", subdir: "skills", targetPaths: ["/p/c"] }],
				[{ entry: "c", subdir: "skills" }],
			)
			expect(merged).toEqual([
				{ entry: "c", subdir: "skills", targetPaths: ["/p/c"] },
			])
		})

		it("keys by subdir+entry so same name in different subdirs stays separate", () => {
			const merged = mergeConflicts(
				[],
				[
					{ entry: "x", subdir: "skills" },
					{ entry: "x", subdir: "commands" },
				],
			)
			expect(merged).toHaveLength(2)
		})
	})
})

describe("agent-setup filesystem helpers", () => {
	let tmp: string

	beforeEach(async () => {
		tmp = await fs.mkdtemp(path.join(os.tmpdir(), "agent-setup-"))
	})

	afterEach(async () => {
		await fs.remove(tmp)
		vi.restoreAllMocks()
	})

	it("presentLinkSubdirs detects which canonical dirs exist", async () => {
		await fs.ensureDir(path.join(tmp, "skills"))
		await fs.ensureDir(path.join(tmp, "commands"))
		const present = await presentLinkSubdirs(tmp)
		expect(present).toEqual(["skills", "commands"])
	})

	it("installs scripts with placeholders filled for project scope", async () => {
		const { shPath, ps1Path } = await installAgentSetupScripts(
			tmp,
			"project",
			"skills|/repo/.claude/skills",
		)
		const sh = await fs.readFile(shPath, "utf-8")
		expect(sh).toContain('AGENTS_DIR=".agents"')
		expect(sh).toContain("skills|/repo/.claude/skills")
		expect(sh).not.toContain("__AGENTS_DIR__")
		const ps1 = await fs.readFile(ps1Path, "utf-8")
		expect(ps1).toContain("skills|/repo/.claude/skills")
		const mode = (await fs.stat(shPath)).mode & 0o777
		expect(mode & 0o100).toBeTruthy()
	})

	it("installs scripts with absolute AGENTS_DIR for global scope", async () => {
		const { shPath } = await installAgentSetupScripts(tmp, "global", "")
		const sh = await fs.readFile(shPath, "utf-8")
		expect(sh).toContain(`AGENTS_DIR="${tmp}"`)
	})

	it("fills the link map without corrupting the doc comment (valid bash)", async () => {
		if (process.platform === "win32") return
		const linkMap = [
			"skills|/a/.claude/skills",
			"skills|/a/.codex/skills",
		].join("\n")
		const { shPath } = await installAgentSetupScripts(tmp, "global", linkMap)
		expect(() => execFileSync("bash", ["-n", shPath])).not.toThrow()
	})

	it("wires session-start hooks into per-platform config files", async () => {
		const wired = await wireSessionStartHooks(
			"project",
			tmp,
			".agents/hooks/agent-setup.sh",
		)
		expect(wired).toEqual(["claude-code", "gemini", "codex", "copilot"])

		const claude = await fs.readJson(path.join(tmp, ".claude", "settings.json"))
		expect(claude.hooks.SessionStart[0].hooks[0].command).toBe(
			".agents/hooks/agent-setup.sh",
		)

		const codex = await fs.readFile(
			path.join(tmp, ".codex", "config.toml"),
			"utf-8",
		)
		expect(codex).toContain("[[hooks.SessionStart]]")

		const copilot = await fs.readJson(
			path.join(tmp, ".github", "hooks", "agent-setup.json"),
		)
		expect(copilot.hooks.sessionStart[0].bash).toBe(
			".agents/hooks/agent-setup.sh",
		)
	})

	it("backs up an existing config and merges idempotently", async () => {
		const claudeFile = path.join(tmp, ".claude", "settings.json")
		await fs.ensureDir(path.dirname(claudeFile))
		await fs.writeJson(claudeFile, { model: "opus" })

		await wireSessionStartHooks("project", tmp, "cmd.sh")
		await wireSessionStartHooks("project", tmp, "cmd.sh")

		expect(await fs.pathExists(`${claudeFile}.bak`)).toBe(true)
		const merged = await fs.readJson(claudeFile)
		expect(merged.model).toBe("opus")
		expect(merged.hooks.SessionStart).toHaveLength(1)
	})

	it("uses global hook-config locations for global scope", async () => {
		const homedir = vi.spyOn(os, "homedir").mockReturnValue(tmp)
		await wireSessionStartHooks("global", tmp, "/abs/agent-setup.sh")
		expect(
			await fs.pathExists(
				path.join(tmp, ".copilot", "hooks", "agent-setup.json"),
			),
		).toBe(true)
		homedir.mockRestore()
	})

	it("runAgentSetupScript is a no-op on win32", () => {
		const spy = vi.spyOn(process, "platform", "get").mockReturnValue("win32")
		expect(() => runAgentSetupScript("/x.sh")).not.toThrow()
		spy.mockRestore()
	})

	it("wireAgentSetup installs scripts, wires hooks and skips the script on win32", async () => {
		await fs.ensureDir(path.join(tmp, "skills"))
		const homedir = vi.spyOn(os, "homedir").mockReturnValue(tmp)
		const platform = vi
			.spyOn(process, "platform", "get")
			.mockReturnValue("win32")

		const result = await wireAgentSetup(tmp, "global", tmp)

		expect(result.ranScript).toBe(false)
		expect(result.wiredPlatforms).toContain("claude-code")
		expect(await fs.pathExists(path.join(tmp, "hooks", "agent-setup.sh"))).toBe(
			true,
		)
		platform.mockRestore()
		homedir.mockRestore()
	})

	it("wireSessionStartHooks only wires the selected platforms", async () => {
		const homedir = vi.spyOn(os, "homedir").mockReturnValue(tmp)
		const wired = await wireSessionStartHooks("global", tmp, "cmd.sh", [
			"claude-code",
		])
		expect(wired).toEqual(["claude-code"])
		expect(
			await fs.pathExists(path.join(tmp, ".claude", "settings.json")),
		).toBe(true)
		expect(await fs.pathExists(path.join(tmp, ".codex", "config.toml"))).toBe(
			false,
		)
		homedir.mockRestore()
	})

	it("wireSessionStartHooks treats antigravity as wiring the gemini config", async () => {
		const homedir = vi.spyOn(os, "homedir").mockReturnValue(tmp)
		const wired = await wireSessionStartHooks("global", tmp, "cmd.sh", [
			"antigravity",
		])
		expect(wired).toContain("gemini")
		homedir.mockRestore()
	})

	describe("detectConflicts", () => {
		it("flags a real file/dir but not an existing symlink", async () => {
			const agentsBase = path.join(tmp, ".agents")
			await fs.ensureDir(path.join(agentsBase, "skills", "dup"))
			await fs.ensureDir(path.join(agentsBase, "skills", "linked"))

			const claudeSkills = path.join(tmp, ".claude", "skills")
			await fs.ensureDir(claudeSkills)
			await fs.ensureDir(path.join(claudeSkills, "dup"))
			await fs.symlink(
				path.join(agentsBase, "skills", "linked"),
				path.join(claudeSkills, "linked"),
			)

			const conflicts = await detectConflicts(
				agentsBase,
				["claude-code"],
				"project",
				tmp,
			)

			expect(conflicts).toHaveLength(1)
			expect(conflicts[0].entry).toBe("dup")
			expect(conflicts[0].subdir).toBe("skills")
			expect(conflicts[0].targetPaths).toEqual([path.join(claudeSkills, "dup")])
		})

		it("returns no conflicts when the selected dirs are empty", async () => {
			const agentsBase = path.join(tmp, ".agents")
			await fs.ensureDir(path.join(agentsBase, "skills", "thing"))
			const conflicts = await detectConflicts(
				agentsBase,
				["claude-code"],
				"project",
				tmp,
			)
			expect(conflicts).toEqual([])
		})
	})

	it("removeAgentDirEntries removes each target path", async () => {
		const a = path.join(tmp, "a")
		const b = path.join(tmp, "b")
		await fs.ensureDir(a)
		await fs.writeFile(b, "x")
		await removeAgentDirEntries([a, b])
		expect(await fs.pathExists(a)).toBe(false)
		expect(await fs.pathExists(b)).toBe(false)
	})

	it("dropAgentsEntry removes the entry from .agents", async () => {
		const entry = path.join(tmp, "skills", "gone")
		await fs.ensureDir(entry)
		await dropAgentsEntry(tmp, "skills", "gone")
		expect(await fs.pathExists(entry)).toBe(false)
	})
})
