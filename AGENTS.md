# AGENTS.md

This file provides guidance to agents working in this repository.

## Project business purpose
- Tranlate various formats of text (plain text, html, json, php) between English and other languages.
- Text are mostly trading, crypto, forex related.


## Purpose and Precedence

- MUST means required.
- SHOULD means recommended unless there is a concrete reason to deviate.
- MAY means optional.
- Root `AGENTS.md` defines repository-wide defaults. If a deeper path later adds a more specific `AGENTS.md`, the deeper file SHOULD be treated as higher precedence for that subtree.

## Non-negotiables

- Analyze code before writing.
- Keep changes minimal.
- Create code simple as possible
- Create code very readable
- Ask before add any new dependencies
- ASk before change `tsconfig.json`
- Use `npm` as package manager
- Use ESM imports
- Use 'Function Declaration' for named functions
- Use 'Arrow Function' for anonymous and nested functions
- Avoid to use `null` use `undefined` instead

## Other rules
- When user ask to PLAN a feature, use the [plan.mdc](.rules/shared/development/plan.mdc) guide.
- Rules for `Makefile` are defined in [makefile.mdc](.rules/shared/development/makefile.mdc).
- When planning or writing BACKEND code, use rules defined in [backend.mdc](.rules/shared/development/backend/backend.mdc), [envs.mdc](.rules/shared/development/backend/envs.mdc), [errors.mdc](.rules/shared/development/backend/errors.mdc), [logging.mdc](.rules/shared/development/backend/logging.mdc), [architecture.mdc](.rules/shared/development/backend/architecture/architecture.mdc), [providers.mdc](.rules/shared/development/backend/architecture/providers.mdc), [usecases.mdc](.rules/shared/development/backend/architecture/usecases.mdc)
- When planning, changing, or writing code for DATABASE, additional to BACKEND rules above, use rules defined in [repositories.mdc](.rules/shared/development/backend/database/repositories.mdc)
- When planning or writing API code, additional to BACKEND rules above, use rules defined in [api.mdc](.rules/shared/development/backend/api/api.mdc), [create-endpoint.mdc](.rules/shared/development/backend/api/create-endpoint.mdc)
