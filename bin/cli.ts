#!/usr/bin/env node
import { intro, isCancel, outro, select, text } from "@clack/prompts"
import { Command } from "commander"
import pc from "picocolors"
import { add } from "@/commands/add"
import { list } from "@/commands/list"
import { remove } from "@/commands/remove"
import type { Scope } from "@/utils/paths"
import {
	isValidListRemoveScopeFlag,
	isValidScopeFlag,
	type ScopeChoice,
} from "@/utils/scope-prompt"
import { version } from "../package.json"

const program = new Command()

program
	.name("ai-agent")
	.description("CLI to manage AI agent skills")
	.version(version)

function parseScopeFlag(value: unknown): Scope | undefined {
	if (value === undefined) return undefined
	if (isValidScopeFlag(value)) return value
	console.error(
		pc.red(`Invalid --scope value: ${value}. Expected "global" or "project".`),
	)
	process.exit(1)
}

function parseListRemoveScopeFlag(value: unknown): ScopeChoice | undefined {
	if (value === undefined) return undefined
	if (isValidListRemoveScopeFlag(value)) return value
	console.error(
		pc.red(
			`Invalid --scope value: ${value}. Expected "global", "project", or "both".`,
		),
	)
	process.exit(1)
}

async function interactiveMain() {
	intro(pc.bgCyan(pc.black(" AI Manager ")))

	while (true) {
		const action = await select({
			message: "What would you like to do?",
			options: [
				{ label: "Add Skills (Install)", value: "add" },
				{ label: "List Skills", value: "list" },
				{ label: "Install from GitHub", value: "install-url" },
				{ label: "Remove Skills", value: "remove" },
				{ label: "Exit", value: "exit" },
			],
		})

		if (isCancel(action) || action === "exit") {
			break
		}

		switch (action) {
			case "add":
				await add(undefined, undefined, { skipIntro: true })
				break
			case "list":
				await list(undefined, { skipIntro: true })
				break
			case "install-url": {
				const url = await text({
					message: "Enter the GitHub URL:",
					placeholder: "https://github.com/owner/repo/tree/main/path/to/skill",
					validate: (value) => {
						if (!value) return "URL is required."
						if (!value.startsWith("https://github.com/"))
							return "Must be a GitHub URL."
					},
				})
				if (isCancel(url)) break
				await add("skill", url, { skipIntro: true })
				break
			}
			case "remove":
				await remove(undefined, { skipIntro: true })
				break
		}
	}

	outro("Goodbye!")
}

program
	.command("list [type]")
	.description("List available skills")
	.option("-l, --local", "List installed items locally")
	.option(
		"-s, --scope <scope>",
		'Scope when listing local installs: "global", "project", or "both"',
	)
	.action(async (type, opts) => {
		const scope = parseListRemoveScopeFlag(opts?.scope)
		await list(type, { local: opts?.local, scope })
	})

program
	.command("add [type] [url]")
	.description("Add a skill to platforms (Interactive or from GitHub URL)")
	.option("-s, --scope <scope>", 'Install scope: "global" or "project"')
	.action(async (type, url, opts) => {
		const scope = parseScopeFlag(opts?.scope)
		await add(type, url, { scope })
	})

program
	.command("remove [type]")
	.description("Remove locally installed skills")
	.option(
		"-s, --scope <scope>",
		'Scope to remove from: "global", "project", or "both"',
	)
	.action(async (type, opts) => {
		const scope = parseListRemoveScopeFlag(opts?.scope)
		await remove(type || "", { scope })
	})

// If no arguments, start interactive mode
if (process.argv.length <= 2) {
	await interactiveMain()
} else {
	await program.parseAsync()
}
