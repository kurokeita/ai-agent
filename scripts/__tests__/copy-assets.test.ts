import fs from "fs-extra"
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type MockInstance,
	vi,
} from "vitest"

vi.mock("fs-extra")

describe("scripts/copy-assets.ts", () => {
	let mockExit: MockInstance
	let mockConsoleLog: MockInstance
	let mockConsoleError: MockInstance

	beforeEach(() => {
		mockExit = vi
			.spyOn(process, "exit")
			.mockImplementation(() => undefined as never)
		mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {})
		mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {})
	})

	afterEach(() => {
		vi.resetAllMocks()
		vi.resetModules()
	})

	it("should copy all assets correctly", async () => {
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockResolvedValue(true)

		await import("../copy-assets.js")

		expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining("dist"))
		expect(fs.copy).toHaveBeenCalledTimes(3)
		expect(mockConsoleLog).toHaveBeenCalledWith(
			expect.stringContaining("Assets copied to dist"),
		)
	})

	it("should exit if skills directory is missing", async () => {
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockResolvedValue(false)

		await import("../copy-assets.js")

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Skills directory not found"),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})

	it("should handle error during copy", async () => {
		vi.mocked(fs.pathExists as () => Promise<boolean>).mockResolvedValue(true)
		vi.mocked(fs.copy).mockRejectedValue(new Error("Copy failed") as never)

		await import("../copy-assets.js")

		expect(mockConsoleError).toHaveBeenCalledWith(
			expect.stringContaining("Error copying assets:"),
			expect.any(Error),
		)
		expect(mockExit).toHaveBeenCalledWith(1)
	})
})
