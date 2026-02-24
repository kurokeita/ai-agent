import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import * as addCmd from "../../src/commands/add.js";
import * as importCmd from "../../src/commands/import.js";
import * as listCmd from "../../src/commands/list.js";
import * as removeCmd from "../../src/commands/remove.js";

// Mock the command modules
vi.mock("../../src/commands/add.js");
vi.mock("../../src/commands/import.js");
vi.mock("../../src/commands/list.js");
vi.mock("../../src/commands/remove.js");

describe("bin/cli.ts", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		// Mock process.argv
		process.argv = ["node", "cli.js"];
        vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
	});

    it("should call list command", async () => {
        process.argv = ["node", "cli.js", "list", "skill", "--local"];
        await import("../cli.ts?test=list");
        expect(listCmd.list).toHaveBeenCalledWith("skill", expect.objectContaining({ local: true }), expect.anything());
    });

    it("should call add command", async () => {
        process.argv = ["node", "cli.js", "add", "skill", "url"];
        await import("../cli.ts?test=add");
        expect(addCmd.add).toHaveBeenCalledWith("skill", "url", expect.anything(), expect.anything());
    });

    it("should call import command", async () => {
        process.argv = ["node", "cli.js", "import", "skill", "url"];
        await import("../cli.ts?test=import");
        expect(importCmd.importItem).toHaveBeenCalledWith("skill", "url", expect.anything(), expect.anything());
    });

    it("should call remove command", async () => {
        process.argv = ["node", "cli.js", "remove", "skill"];
        await import("../cli.ts?test=remove");
        expect(removeCmd.remove).toHaveBeenCalledWith("skill", expect.anything(), expect.anything());
    });
});