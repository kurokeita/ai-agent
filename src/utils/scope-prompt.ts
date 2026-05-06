import { isCancel, note, select } from "@clack/prompts"
import pc from "picocolors"

import type { Scope } from "./paths"
import {
	describeRefusal,
	type ResolveScopeOptions,
	resolveScope,
} from "./scope"

export interface ChooseScopeOptions extends ResolveScopeOptions {
	flag?: Scope
	initial?: Scope
}

export type ChooseScopeResult =
	| { cancelled: true }
	| { cancelled: false; scope: Scope; root: string }

export function isValidScopeFlag(value: unknown): value is Scope {
	return value === "global" || value === "project"
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
		note(
			pc.yellow(describeRefusal(resolution.reason)),
			"Project scope unavailable",
		)
		return { cancelled: true }
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
