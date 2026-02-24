import { beforeEach, describe, expect, it, vi } from "vitest";

// Define mocks before anything else
vi.mock("../../src/commands/add.js");
vi.mock("../../src/commands/import.js");
vi.mock("../../src/commands/list.js");
vi.mock("../../src/commands/remove.js");

describe("bin/cli.ts", () => {
	beforeEach(async () => {
		vi.resetAllMocks();
		// Mock process.argv
		process.argv = ["node", "cli.js"];
		vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
		// Clear module cache to re-run the script
		vi.resetModules();
	});

	it("should call list command", async () => {
		const listCmd = await import("../../src/commands/list.js");
		process.argv = ["node", "cli.js", "list", "skill", "--local"];
		await import("../cli.js");
		expect(listCmd.list).toHaveBeenCalledWith(
			"skill",
			expect.objectContaining({ local: true }),
			expect.anything(),
		);
	});

	it("should call add command", async () => {
		const addCmd = await import("../../src/commands/add.js");
		process.argv = ["node", "cli.js", "add", "skill", "url"];
		await import("../cli.js");
		expect(addCmd.add).toHaveBeenCalledWith(
			"skill",
			"url",
			expect.anything(),
			expect.anything(),
		);
	});

	it("should call import command", async () => {
		const importCmd = await import("../../src/commands/import.js");
		process.argv = ["node", "cli.js", "import", "skill", "url"];
		await import("../cli.js");
		expect(importCmd.importItem).toHaveBeenCalledWith(
			"skill",
			"url",
			expect.anything(),
			expect.anything(),
		);
	});

	it("should call remove command", async () => {
		const removeCmd = await import("../../src/commands/remove.js");
		process.argv = ["node", "cli.js", "remove", "skill"];
		await import("../cli.js");
		expect(removeCmd.remove).toHaveBeenCalledWith(
			"skill",
			expect.anything(),
			expect.anything(),
		);
	});
});
