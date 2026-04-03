import { PassThrough, Writable } from "node:stream"

import { AutocompletePrompt } from "@clack/core"
import { describe, expect, it } from "vitest"

import { enableAutocompleteMultiSelectShiftAToggle } from "../prompts.js"

describe("enableAutocompleteMultiSelectShiftAToggle", () => {
	it("selects and deselects the currently filtered enabled options with Shift+A", async () => {
		const options = [
			{ label: "alpha", value: "alpha" },
			{ label: "beta", value: "beta" },
			{ label: "gamma", value: "gamma", disabled: true },
		]

		const prompt = new AutocompletePrompt<any>({
			options,
			multiple: true,
			render() {
				return ""
			},
		})

		enableAutocompleteMultiSelectShiftAToggle()
		prompt.filteredOptions = [...options]

		prompt.emit("key", "A", { name: "a", shift: true })
		expect(prompt.selectedValues).toEqual(["alpha", "beta"])

		prompt.emit("key", "A", { name: "a", shift: true })
		expect(prompt.selectedValues).toEqual([])
	})

	it("toggles only the filtered options and preserves selections outside the filter", async () => {
		const options = [
			{ label: "alpha", value: "alpha" },
			{ label: "beta", value: "beta" },
			{ label: "delta", value: "delta" },
		]

		const prompt = new AutocompletePrompt<any>({
			options,
			multiple: true,
			render() {
				return ""
			},
		})

		enableAutocompleteMultiSelectShiftAToggle()
		prompt.selectedValues = ["delta"]
		prompt.filteredOptions = options.slice(0, 2)

		prompt.emit("key", "A", { name: "a", shift: true })
		expect(prompt.selectedValues).toEqual(["delta", "alpha", "beta"])

		prompt.emit("key", "A", { name: "a", shift: true })
		expect(prompt.selectedValues).toEqual(["delta"])
	})

	it("treats Shift+A as an action key for autocomplete multiselects", () => {
		enableAutocompleteMultiSelectShiftAToggle()

		const prompt = new AutocompletePrompt<any>({
			options: [{ label: "alpha", value: "alpha" }],
			multiple: true,
			render() {
				return ""
			},
		})

		expect((prompt as any)._isActionKey("A", { name: "a", shift: true })).toBe(
			true,
		)
		expect((prompt as any)._isActionKey("a", { name: "a", shift: false })).toBe(
			false,
		)
	})

	it("adds Shift+A guidance to the styled autocomplete multiselect help text", () => {
		enableAutocompleteMultiSelectShiftAToggle()
		const dimOpen = "\u001B[2m"
		const reset = "\u001B[22m"

		const prompt = new AutocompletePrompt<any>({
			options: [{ label: "alpha", value: "alpha" }],
			multiple: true,
			render() {
				return `${dimOpen}↑/↓${reset} to navigate • ${dimOpen}Tab:${reset} select • ${dimOpen}Enter:${reset} confirm • ${dimOpen}Type:${reset} to search`
			},
		})

		prompt.emit("key", undefined, { name: "down" })

		expect((prompt as any)._render()).toContain("Shift+A: toggle all")
	})

	it("shows Shift+A guidance on the initial styled render before any keypress", () => {
		enableAutocompleteMultiSelectShiftAToggle()
		const dimOpen = "\u001B[2m"
		const reset = "\u001B[22m"
		const input = new PassThrough() as PassThrough & {
			isTTY: boolean
			setRawMode: (value: boolean) => void
		}
		let outputText = ""
		const output = new Writable({
			write(chunk, _encoding, callback) {
				outputText += chunk.toString()
				callback()
			},
		}) as Writable & { columns: number; rows: number }
		const abortController = new AbortController()

		input.isTTY = true
		input.setRawMode = () => {}
		output.columns = 120
		output.rows = 40

		const prompt = new AutocompletePrompt<any>({
			options: [{ label: "alpha", value: "alpha" }],
			multiple: true,
			input,
			output,
			signal: abortController.signal,
			render() {
				return `${dimOpen}↑/↓${reset} to navigate • ${dimOpen}Tab:${reset} select • ${dimOpen}Enter:${reset} confirm • ${dimOpen}Type:${reset} to search`
			},
		})

		const promptPromise = prompt.prompt()
		abortController.abort()

		return promptPromise.then(() => {
			expect(outputText).toContain("Shift+A: toggle all")
		})
	})
})
