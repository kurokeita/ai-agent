#!/usr/bin/env node
import { Command } from "commander";
import { addSkill } from "../src/commands/add.js";
import { importSkill } from "../src/commands/import.js";
import { listSkills } from "../src/commands/list.js";

const program = new Command();

program.name("skills").description("CLI to manage AI skills").version("1.0.0");

program.command("list").description("List available skills").action(listSkills);

program
	.command("add [url]")
	.description("Add skills to platforms (Interactive or from GitHub URL)")
	.action(addSkill);

program
	.command("import <url>")
	.description("Import a skill from GitHub to the repo")
	.action(importSkill);

program.parse();
