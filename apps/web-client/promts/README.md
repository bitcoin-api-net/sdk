# AI Prompts

Use prompts from this directory for different tasks.

## Visily AI -> Layout

### Tips:

- Do not forget to open new chat for each page in order to keep context low and reduce tokens consumption.

### Basic prompt

AI Mode: Plan
Main Goal: Create exactly the same page in project from the source page.
Source Page: apps/web-client/raw/Sign In Page/index.html
Destination Page: apps/web-client/src/pages/authorization/sign-in.astro
Use rules: .cursor/rules/layout-creation.mdc
Use base layout: apps/web-client/src/layouts/PublicPagesLayout.astro

### If interactive island required

Use Vue: Page has to be .astro but form have to be Vue component with reactivity
