# Active Tasks

## In Progress
- (platform) Nuxt 3 migration plan — started 2026-03-14
  - Scope: migrate SkopeUI from Nuxt 2/Vue 2 to Nuxt 3/Vue 3 while preserving route contracts and dataset workflows.
  - Related files: `app/nuxt.config.js`, `app/package.json`, `app/pages/**`, `app/components/**`, `app/store/**`, `app/plugins/**`, `app/server/index.js`.
  - Blockers: final choice for state strategy (`@pinia/nuxt` vs Vuex compatibility bridge) and Vuetify migration approach.
  - Artifact: `.agent/checkpoints/2026-03-14-nuxt3-dependency-compatibility-matrix.md`

### Migration Workstreams (Ordered)
1. Discovery and compatibility inventory
  - Audit all Nuxt 2-specific APIs (`asyncData`, `fetch`, middleware, plugins, runtime config usage).
  - Inventory third-party dependencies for Nuxt 3/Vue 3 compatibility.
  - Produce a gap list with required replacements and risk rating.

2. Foundation setup
  - Create migration branch and add Nuxt 3 baseline (`nuxi`, `nuxt.config.ts`, Nitro defaults).
  - Define environment/runtime config strategy replacing Nuxt 2 conventions.
  - Establish lint/typecheck/build commands for the new app shell.

3. Routing and page migration
  - Port file-based routes to Nuxt 3 conventions (`pages/`, dynamic params, nested routes).
  - Preserve existing dataset route contracts under `/dataset/:id/*`.
  - Move page-level data loading to `useAsyncData`/`useFetch` with clear SSR/CSR boundaries.

4. State layer migration
  - Migrate Vuex modules to Pinia stores (preferred) with one store per domain module.
  - Keep action/mutation intent through store actions and computed getters.
  - Add transition adapters where needed to reduce cutover risk.

5. Plugins and middleware migration
  - Convert plugins to Nuxt 3 plugin format (`defineNuxtPlugin`).
  - Migrate axios integration to `$fetch` or compatible client abstraction.
  - Port middleware to route middleware and validate navigation behavior.

6. UI/component migration
  - Update components to Vue 3 patterns (`setup`, composables, lifecycle changes).
  - Address Vuetify version strategy and theme token compatibility.
  - Validate key dataset flows: metadata, analysis, map, time series.

7. Server/runtime migration
  - Replace/customize `app/server/index.js` behavior for Nitro/server routes as needed.
  - Validate deployment assumptions in root environment YAML files.

8. Verification and rollout
  - Run regression suite and targeted manual smoke tests for critical routes.
  - Execute staged rollout (dev -> staging -> prod) with rollback path.
  - Record migration checkpoint and handoff notes.

## Next Up
- Decide state migration target: Pinia-first vs temporary Vuex bridge
- Confirm Vuetify migration path and version lock
- Resolve matrix validation gates (`robots`, analytics, hapi necessity)

## Definition of Done (per task)
- All critical dataset routes work under Nuxt 3 with parity on user-facing behavior
- Store layer is fully migrated or bridge is documented and time-boxed
- Plugins/middleware/server runtime behavior validated in dev and staging
- Build/test/lint checks pass in CI for Nuxt 3 branch
- `.agent/handoffs/current.md` and migration checkpoint are updated
