# AI Development rules

Shared Cursor rules for consistent AI-assisted development across projects.

## Setup as submodule

Add to your project:

```bash
git submodule add git@bitbucket.org:iaft/development-rules.git .cursor/rules/shared
```

If cloning a project that already has this submodule:

```bash
git submodule update --init --recursive
```

To pull latest rule updates:

```bash
git submodule update --remote .cursor/rules/shared
```