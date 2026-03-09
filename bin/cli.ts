#!/usr/bin/env node
import { intro, isCancel, outro, select } from "@clack/prompts"
import { Command } from "commander"
import pc from "picocolors"
import { add } from "@/commands/add"
import { importItem } from "@/commands/import"
import { list } from "@/commands/list"
import { remove } from "@/commands/remove"

const program = new Command()

program
	.name("ai-agent")
	.description("CLI to manage AI agents, skills, and workflows")
	.version("1.4.0")

async function interactiveMain() {
	intro(pc.bgCyan(pc.black(" AI Manager ")))

	while (true) {
		const action = await select({
			message: "What would you like to do?",
			options: [
				{ label: "Add Item (Install)", value: "add" },
				{ label: "List Items", value: "list" },
				{ label: "Import from GitHub", value: "import" },
				{ label: "Remove Items", value: "remove" },
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
			case "import":
				await importItem(undefined, undefined, { skipIntro: true })
				break
			case "remove":
				await remove(undefined, { skipIntro: true })
				break
		}
	}

	outro("Goodbye!")
}

program
	.command("list [type]")
	.description("List available items (skills, agents, workflows)")
	.option("-l, --local", "List installed items locally")
	.action(list)

program
	.command("add [type] [url]")
	.description(
		"Add an item (skill, agent, workflow) to platforms (Interactive or from GitHub URL)",
	)
	.action(add)

program
	.command("import [type] [url]")
	.description("Import an item from GitHub to the repo")
	.action(async (type, url) => {
		await importItem(type || "", url || "")
	})

program
	.command("remove [type]")
	.description("Remove locally installed items (skills, agents, workflows)")
	.action(async (type) => {
		await remove(type || "")
	})

// If no arguments, start interactive mode
if (process.argv.length <= 2) {
	interactiveMain()
} else {
	program.parse()
}
