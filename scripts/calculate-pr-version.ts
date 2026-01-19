import { execSync } from "node:child_process";
import fs from "node:fs";

// Get branch name from environment or argument
let branchName = process.env.BRANCH_NAME || process.argv[2];

if (!branchName) {
	try {
		branchName = execSync("git rev-parse --abbrev-ref HEAD", {
			encoding: "utf-8",
		}).trim();
	} catch (_) {
		// Ignore error, will fail below if still empty
	}
}

if (!branchName) {
	console.error(
		"Error: BRANCH_NAME env, argument, or git repository is required",
	);
	process.exit(1);
}

// Sanitize branch name to be valid for semver prerelease
// Replace non-alphanumeric chars with hyphens, remove leading/trailing hyphens
const sanitizedBranch = branchName
	.replace(/[^a-zA-Z0-9]/g, "-")
	.replace(/^-+|-+$/g, "")
	.toLowerCase();

if (!sanitizedBranch) {
	console.error("Error: Sanitized branch name is empty");
	process.exit(1);
}

// Read base version from package.json
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const baseVersion = packageJson.version;

// Get all tags matching the pattern
try {
	// Fetch tags first - this is important in CI
	// In a shallow clone, we might not have all tags, so fetching is safer if mostly shallow,
	// but usually actions/checkout with fetch-depth: 0 is used.
	// We assume fetch-depth: 0 is used in the workflow.

	const tagsOutput = execSync("git tag --list", { encoding: "utf-8" });
	const tags = tagsOutput.split("\n").filter(Boolean);

	// Filter tags that match the expected pattern: vX.Y.Z-sanitizedBranch.iteration
	// Note: npm version might create tags with 'v' prefix or without.
	// We should handle both or stick to one. Standard npm version creates 'v' prefix.
	// We will output the raw version string (without v) for the next step, but checking tags with v.

	const prefix = `v${baseVersion}-${sanitizedBranch}.`;

	let maxIteration = 0;

	for (const tag of tags) {
		if (tag.startsWith(prefix)) {
			const iterationPart = tag.slice(prefix.length);
			const iteration = parseInt(iterationPart, 10);
			if (!Number.isNaN(iteration) && iteration > maxIteration) {
				maxIteration = iteration;
			}
		}
	}

	const nextIteration = maxIteration + 1;
	const nextVersion = `${baseVersion}-${sanitizedBranch}.${nextIteration}`;

	console.log(nextVersion);
} catch (error) {
	console.error("Error calculating version:", error);
	process.exit(1);
}
