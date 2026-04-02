# Conventional Commits Specification

The Conventional Commits specification is a lightweight convention on top of commit messages. It provides an easy set of rules for creating an explicit commit history; which makes it easier to write automated tools on top of.

## The Specification

The commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Type

The type is a short string that describes the category of the change. Common types include:

- `feat`: (feature)
- `fix`: (bug fix)
- `docs`: (documentation)
- `style`: (formatting, missing semi-colons, etc; no code change)
- `refactor`: (refactoring production code)
- `test`: (adding missing tests, refactoring tests; no production code change)
- `chore`: (updating grunt tasks etc; no production code change)

### Scope

A scope MAY be provided after a type. A scope MUST consist of a noun describing a section of the codebase surrounded by parenthesis, e.g., `fix(parser):`

### Description

The description contains a succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize the first letter
- no dot (.) at the end

### Body

A longer commit body MAY be provided after the short description, providing additional contextual information about the code changes. The body MUST begin one blank line after the description.

### Footer

One or more footers MAY be provided one blank line after the body. Each footer MUST consist of a word token, followed by either a `:<space>` or `<space>#` separator, followed by a string value (this is inspired by the git trailer convention).

### Breaking Changes

A breaking change MUST be indicated by an `!` after the type/scope, or as a footer entry starting with `BREAKING CHANGE:`.

## Examples

### Commit message with description and breaking change footer

```
feat: allow provided config object to extend other configs

BREAKING CHANGE: `extends` key in config file is now used for extending other config files
```

### Commit message with ! to draw attention to breaking change

```
feat!: send an email to the customer when a product is shipped
```

### Commit message with scope and ! to draw attention to breaking change

```
chore(api)!: drop support for Node 6
```

### Commit message with multi-paragraph body and multiple footers

```
fix: prevent racing of requests

Introduce a request id and a reference to latest request. All
rest responses are checked against the current id before update.

Reviewers: adrian, jdoe
Fixes #123
```
