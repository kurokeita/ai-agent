import path from "node:path"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["**/*.test.ts"],
		// The statusline work pane's tests run under `claude plugin test`.
		exclude: [...configDefaults.exclude, "skills/statusline-setup/mod/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/**/*.ts", "bin/**/*.ts", "scripts/**/*.ts"],
			exclude: ["**/*.test.ts", "dist/**"],
			thresholds: {
				statements: 90,
				branches: 90,
				functions: 90,
				lines: 90,
			},
		},
	},
})
