import { isCancel, note, select } from "@clack/prompts"
import pc from "picocolors"

import type { Scope } from "./paths"
import {
	describeRefusal,
	type ResolveScopeOptions,
	resolveScope,
} from "./scope"

export type ScopeChoice = Scope | "both"

export interface ChooseScopeOptions extends ResolveScopeOptions {
	flag?: Scope
	initial?: Scope
}

export type ChooseScopeResult =
	| { cancelled: true }
	| { rejected: true; reason: string }
	| { cancelled: false; scope: Scope; root: string }

export interface ChooseListRemoveScopeOptions extends ResolveScopeOptions {
	flag?: ScopeChoice
	action: "list" | "remove"
}

export type ListRemoveScopeResult =
	| { cancelled: true }
	| { rejected: true; reason: string }
	| {
			cancelled: false
			scope: ScopeChoice
			homedir: string
			projectRoot?: string
	  }

export function isValidScopeFlag(value: unknown): value is Scope {
	return value === "global" || value === "project"
}

export function isValidListRemoveScopeFlag(
	value: unknown,
): value is ScopeChoice {
	return value === "global" || value === "project" || value === "both"
}

async function pickScope(initial: Scope): Promise<Scope | "__cancel__"> {
	const result = await select<Scope>({
		message: "Choose install scope:",
		options: [
			{
				label: "Global",
				value: "global",
				hint: "install under your home directory (default)",
			},
			{
				label: "Project",
				value: "project",
				hint: "install under the current project directory",
			},
		],
		initialValue: initial,
	})
	if (isCancel(result)) return "__cancel__"
	return result
}

async function offerGlobalFallback(
	reason: string,
): Promise<Scope | "__cancel__"> {
	note(reason, "Project scope unavailable")
	const choice = await select<"global" | "cancel">({
		message: "What would you like to do?",
		options: [
			{ label: "Install at global scope instead", value: "global" },
			{ label: "Cancel", value: "cancel" },
		],
		initialValue: "global",
	})
	if (isCancel(choice) || choice === "cancel") return "__cancel__"
	return "global"
}

export async function chooseInstallScope(
	options: ChooseScopeOptions = {},
): Promise<ChooseScopeResult> {
	const requested =
		options.flag ?? (await pickScope(options.initial ?? "global"))

	if (requested === "__cancel__") return { cancelled: true }

	const resolution = resolveScope(requested, options)

	if (resolution.ok) {
		return {
			cancelled: false,
			scope: resolution.scope,
			root: resolution.root,
		}
	}

	if (options.flag === "project") {
		const reason = describeRefusal(resolution.reason)
		note(pc.yellow(reason), "Project scope unavailable")
		return { rejected: true, reason }
	}

	const fallback = await offerGlobalFallback(describeRefusal(resolution.reason))
	if (fallback === "__cancel__") return { cancelled: true }

	const fallbackResolution = resolveScope("global", options)
	if (!fallbackResolution.ok) return { cancelled: true }
	return {
		cancelled: false,
		scope: fallbackResolution.scope,
		root: fallbackResolution.root,
	}
}

async function pickListRemoveScope(
	action: "list" | "remove",
): Promise<ScopeChoice | "__cancel__"> {
	const verb = action === "list" ? "List" : "Remove from"
	const result = await select<ScopeChoice>({
		message: `Choose scope to ${action === "list" ? "list" : "remove from"}:`,
		options: [
			{
				label: "Global",
				value: "global",
				hint: `${verb} items installed under your home directory`,
			},
			{
				label: "Project",
				value: "project",
				hint: `${verb} items under the current project`,
			},
			{
				label: "Both",
				value: "both",
				hint: `${verb} items at both scopes`,
			},
		],
		initialValue: "global",
	})
	if (isCancel(result)) return "__cancel__"
	return result
}

async function offerGlobalOnlyFallback(
	reason: string,
	action: "list" | "remove",
): Promise<"global" | "__cancel__"> {
	note(reason, "Project scope unavailable")
	const verb = action === "list" ? "List" : "Remove from"
	const choice = await select<"global" | "cancel">({
		message: "What would you like to do?",
		options: [
			{ label: `${verb} global scope only`, value: "global" },
			{ label: "Cancel", value: "cancel" },
		],
		initialValue: "global",
	})
	if (isCancel(choice) || choice === "cancel") return "__cancel__"
	return "global"
}

export async function chooseListRemoveScope(
	options: ChooseListRemoveScopeOptions,
): Promise<ListRemoveScopeResult> {
	const requested = options.flag ?? (await pickListRemoveScope(options.action))

	if (requested === "__cancel__") return { cancelled: true }

	if (requested === "global") {
		const resolved = resolveScope("global", options)
		if (!resolved.ok) return { cancelled: true }
		return {
			cancelled: false,
			scope: "global",
			homedir: resolved.root,
		}
	}

	const projectResolution = resolveScope("project", options)

	if (projectResolution.ok) {
		const homeResolution = resolveScope("global", options)
		if (!homeResolution.ok) return { cancelled: true }
		return {
			cancelled: false,
			scope: requested,
			homedir: homeResolution.root,
			projectRoot: projectResolution.root,
		}
	}

	if (options.flag) {
		const reason = describeRefusal(projectResolution.reason)
		note(pc.yellow(reason), "Project scope unavailable")
		return { rejected: true, reason }
	}

	const fallback = await offerGlobalOnlyFallback(
		describeRefusal(projectResolution.reason),
		options.action,
	)
	if (fallback === "__cancel__") return { cancelled: true }

	const homeResolution = resolveScope("global", options)
	if (!homeResolution.ok) return { cancelled: true }
	return {
		cancelled: false,
		scope: "global",
		homedir: homeResolution.root,
	}
}
