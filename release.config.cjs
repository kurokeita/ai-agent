/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
	branches: ["main"],
	repositoryUrl: "https://github.com/kurokeita/ai-agent.git",
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		"@semantic-release/github",
		"@semantic-release/npm",
		[
			"@semantic-release/git",
			{
				assets: ["package.json"],
				message:
					// biome-ignore lint/suspicious/noTemplateCurlyInString: this is intended for semantic-release to bump the package.json version with a proper commit message
					"chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
			},
		],
	],
};
