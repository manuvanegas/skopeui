# Coding Conventions

## General Principles
- Make focused, minimal changes that match current style
- Fix root causes rather than adding temporary patches
- Avoid unrelated refactors in feature/fix PRs

## Vue/Nuxt Patterns
- Keep presentational logic in components and business/data logic in composables/store actions
- Reuse existing component patterns in `app/components/dataset/` before introducing new ones
- Preserve established route file conventions in `app/pages/`

## Naming
- Vue components: `PascalCase.vue`
- Store modules/files: lower-case domain names (`dataset.js`, `metadata.js`)
- Functions/actions: descriptive verbs (`fetchMetadata`, `loadAnalysis`)

## State and Side Effects
- Centralize API calls via Pinia store actions/composables
- Keep state transitions explicit and deterministic
- Prefer derived values through getters/computed properties

## Generated Artifacts
- Keep generated Nuxt/Nitro artifacts under `app/generated/`.
- Do not commit generated build artifacts (`app/generated/.nuxt`, `app/generated/.output`).
- Keep source directories (`app/pages`, `app/components`, `app/stores`) free of generated runtime output.

## Styling
- Use existing SCSS variables and Vuetify tokens
- Avoid introducing hard-coded one-off visual styles when shared tokens exist

## Documentation and Traceability
- For substantial edits, update:
  - `.agent/tasks/active.md`
  - `.agent/handoffs/handoff.md`
  - Optional checkpoint in `.agent/checkpoints/`

## Node Command Execution
- Always run all `npm` and `npx` invocations inside the `web` container.
- Do not run `npm`/`npx` in the host shell.
- Preferred pattern: `docker compose run --rm web npm <command>`.
- Examples:
  - Tests: `docker compose run --rm web npm exec vitest run`
  - Build: `docker compose run --rm web npm run build`
  - Lint: `docker compose run --rm web npm run lintfix`

## Agent File Update Workflow

### When to Update
- At session start: review `project.md`, `domain.md`, `active.md`, and `handoff.md`
- During work: keep `active.md` in sync as scope changes
- Before handoff/end of session: update `handoff.md` with latest status and next actions
- After meaningful milestone: add a new dated file in `.agent/checkpoints/`

### What to Update (Quick Rules)
- `context/project.md`: only for stable architecture/system facts
- `context/conventions.md`: only for durable process/coding norms
- `context/domain.md`: glossary, domain assumptions, and business rules
- `tasks/active.md`: in-progress work, blockers, immediate next steps
- `tasks/backlog.md`: prioritized not-started work
- `handoffs/handoff.md`: current state snapshot for next agent/human
- `checkpoints/YYYY-MM-DD-short-title.md`: milestone record (scope, impact, validation)

### End-of-Session Checklist
- Confirm active task status is accurate in `tasks/active.md`
- Capture latest changes and next 1-3 actions in `handoffs/handoff.md`
- Move completed work from active to backlog/history as needed
- Add a checkpoint file if the session changed behavior/contracts significantly
