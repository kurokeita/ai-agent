import fs from "fs-extra"
import { beforeEach, describe, expect, it, type MockInstance, vi } from "vitest"

vi.mock("fs-extra")

describe("scripts/copy-assets.ts", () => {
	let mockExit: MockInstance
	let mockConsoleLog: MockInstance
	let mockConsoleError: MockInstance

	beforeEach(() => {
		vi.resetAllMocks()
		mockExit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never)
		mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {})
		mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {})
	})

	it("should copy all assets correctly", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: mock
		;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)

		// @ts-expect-error
		await import("../copy-assets.js?test=success")

		expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining("dist"))
		expect(fs.copy).toHaveBeenCalledTimes(3)
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Assets copied to dist"),
		)
	})

	it("should exit if skills directory is missing", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: mock
		;(vi.mocked(fs.pathExists) as any).mockResolvedValue(false)

		// @ts-expect-error
		await import("../copy-assets.js?test=missing")

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Skills directory not found"),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should handle error during copy", async () => {
		// biome-ignore lint/suspicious/noExplicitAny: mock
		;(vi.mocked(fs.pathExists) as any).mockResolvedValue(true)
		vi.mocked(fs.copy).mockRejectedValue(new Error("Copy failed") as never)

		// @ts-expect-error
		await import("../copy-assets.js?test=error")

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Error copying assets:"),
			expect.any(Error),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})
})
