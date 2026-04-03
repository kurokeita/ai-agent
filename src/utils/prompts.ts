import { AutocompletePrompt } from "@clack/core"

type KeyLike = {
	name?: string
	shift?: boolean
}

type AutocompleteOptionLike = {
	value: unknown
	label?: string
	disabled?: boolean
}

type RenderFunction = (this: AutocompletePromptLike) => string | undefined

type AutocompletePromptLike = {
	filteredOptions: AutocompleteOptionLike[]
	multiple: boolean
	selectedValues: unknown[]
	on: (event: string, cb: (...args: unknown[]) => void) => void
	_isActionKey: (char: string | undefined, key: KeyLike) => boolean
	emit: (event: string | symbol, ...args: unknown[]) => boolean
	prompt: () => Promise<symbol | unknown>
	render: RenderFunction
	_render: RenderFunction
	__aiManagerShiftAPatched__?: boolean
	__aiManagerShiftAListenerAttached__?: boolean
	__aiManagerShiftARenderPatched__?: boolean
}

const autocompletePromptPrototype =
	AutocompletePrompt.prototype as unknown as AutocompletePromptLike

const originalEmit = autocompletePromptPrototype.emit
const originalIsActionKey = autocompletePromptPrototype._isActionKey
const originalPrompt = autocompletePromptPrototype.prompt

function isShiftAToggleKey(key: KeyLike | undefined) {
	return key?.name === "a" && key.shift === true
}

function getAvailableFilteredValues(prompt: AutocompletePromptLike) {
	return prompt.filteredOptions
		.filter((option) => !option.disabled)
		.map((option) => option.value)
}

function toggleFilteredValues(prompt: AutocompletePromptLike) {
	const availableValues = getAvailableFilteredValues(prompt)

	if (availableValues.length === 0) {
		return
	}

	const allFilteredValuesSelected = availableValues.every((value) =>
		prompt.selectedValues.includes(value),
	)

	prompt.selectedValues = allFilteredValuesSelected
		? prompt.selectedValues.filter((value) => !availableValues.includes(value))
		: [
				...prompt.selectedValues,
				...availableValues.filter(
					(value) => !prompt.selectedValues.includes(value),
				),
			]
}

function addShiftATextHint(output: string) {
	if (output.includes("Shift+A")) {
		return output
	}

	const dimOpen = "\u001B[2m"
	const reset = "\u001B[22m"

	return output.replace(/to search(?![\s\S]*to search)/, (match) => {
		return `${match} • ${dimOpen}Shift+A:${reset} toggle all`
	})
}

function patchRenderHint(prompt: AutocompletePromptLike) {
	if (prompt.__aiManagerShiftARenderPatched__) {
		return prompt
	}

	prompt._render = wrapRenderFunction(prompt._render) as RenderFunction
	prompt.__aiManagerShiftARenderPatched__ = true

	return prompt
}

function wrapRenderFunction(render: RenderFunction | undefined) {
	if (!render) {
		return render
	}

	return function (this: AutocompletePromptLike) {
		const output = render.call(this)

		if (typeof output !== "string") {
			return output
		}

		return addShiftATextHint(output)
	}
}

export function attachAutocompleteMultiSelectShiftAToggle(
	prompt: AutocompletePromptLike,
) {
	if (prompt.__aiManagerShiftAListenerAttached__) {
		return prompt
	}

	prompt.on("key", (...args: unknown[]) => {
		const [, key] = args as [string | undefined, KeyLike]

		if (!prompt.multiple || !isShiftAToggleKey(key)) {
			return
		}

		toggleFilteredValues(prompt)
	})

	prompt.__aiManagerShiftAListenerAttached__ = true
	patchRenderHint(prompt)
	return prompt
}

export function enableAutocompleteMultiSelectShiftAToggle() {
	if (autocompletePromptPrototype.__aiManagerShiftAPatched__) {
		return
	}

	autocompletePromptPrototype._isActionKey = function (
		this: AutocompletePromptLike,
		char: string | undefined,
		key: KeyLike,
	) {
		if (this.multiple && isShiftAToggleKey(key)) {
			return true
		}

		return originalIsActionKey.call(this, char, key)
	}

	autocompletePromptPrototype.emit = function (
		this: AutocompletePromptLike,
		event: string | symbol,
		...args: unknown[]
	) {
		attachAutocompleteMultiSelectShiftAToggle(this)

		return originalEmit.call(this, event, ...args)
	}

	autocompletePromptPrototype.prompt = function (this: AutocompletePromptLike) {
		attachAutocompleteMultiSelectShiftAToggle(this)

		return originalPrompt.call(this)
	}

	autocompletePromptPrototype.__aiManagerShiftAPatched__ = true
}
