#!/usr/bin/env node
import { Command } from "commander";
import { add } from "../src/commands/add.js";
import { importItem } from "../src/commands/import.js";
import { list } from "../src/commands/list.js";
import { remove } from "../src/commands/remove.js";

const program = new Command();

program
	.name("ai-agent")
	.description("CLI to manage AI agents, skills, and workflows")
	.version("1.4.0");

program
	.command("list [type]")
	.description("List available items (skills, agents, workflows)")
	.option("-l, --local", "List installed items locally")
	.action(list);

program
	.command("add <type> [url]")
	.description(
		"Add an item (skill, agent, workflow) to platforms (Interactive or from GitHub URL)",
	)
	.action(add);

program
	.command("import <type> <url>")
	.description("Import an item from GitHub to the repo")
	.action(importItem);

program
	.command("remove <type>")
	.description("Remove locally installed items (skills, agents, workflows)")
	.action(remove);

program.parse();
