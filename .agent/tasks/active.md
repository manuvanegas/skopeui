# Active Tasks

## In Progress
- (platform) Nuxt 3 migration plan — started 2026-03-14
  - Scope: migrate SkopeUI from Nuxt 2/Vue 2 to Nuxt 3/Vue 3 while preserving route contracts and dataset workflows.
  - Related files: `app/nuxt.config.js`, `app/package.json`, `app/pages/**`, `app/components/**`, `app/store/**`, `app/plugins/**`, `app/server/index.js`.
  - Blockers: final choice for state strategy (`@pinia/nuxt` vs Vuex compatibility bridge) and Vuetify migration approach.
  - Artifact: `.agent/checkpoints/2026-03-14-nuxt3-dependency-compatibility-matrix.md`
  - Artifact: `.agent/checkpoints/2026-03-14-nuxt3-target-package-draft.md`
  - Draft manifest: `app/package.nuxt3.draft.json`
  - Artifact: `.agent/checkpoints/2026-03-14-nuxt3-target-package-resolved.md`
  - Artifact: `.agent/checkpoints/2026-03-14-nuxt3-config-wiring.md`
  - Artifact: `.agent/checkpoints/2026-03-14-nuxt3-plugin-migration-scaffold.md`
  - Artifact: `.agent/checkpoints/2026-03-14-pinia-app-messages-cutover.md`
  - Artifact: `.agent/checkpoints/2026-03-14-pinia-dataset-cutover.md`
  - Artifact: `.agent/checkpoints/2026-03-14-pinia-metadata-analysis-cutover.md`
  - Artifact: `.agent/checkpoints/2026-03-14-direct-pinia-consumer-migration-round1.md`
  - Artifact: `.agent/checkpoints/2026-03-14-migrated-functionality-tests.md`
  - Artifact: `.agent/checkpoints/2026-03-14-pinia-parity-and-metadata-consumers-round2.md`
  - Artifact: `.agent/checkpoints/2026-03-14-dataset-heavy-consumer-migration-round3.md`
  - Ready manifest: `app/package.nuxt3.ready.json`
  - Package manager: npm (Yarn removed); `package-lock.json` generated via container.
  - Security: GHSA-5c6j-r48x-rmvq tracked in `.agent/checkpoints/2026-03-14-nuxt3-package-apply-step.md`.
  - Tests: migrated-store and api-compat suites passing (12/12).

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
- Confirm whether any Hapi runtime behavior must remain externalized
- Validate staging-like runtime behavior for dataset select/visualize/analyze flows
- Migrate remaining `nuxt-property-decorator` class-style components to Vue 3-compatible patterns (or temporary compatibility path) to unblock Nuxt production build

## Latest Progress (2026-03-14)
- Completed migration of `app/pages/dataset/_id/analyze/_variable.vue` from `$api()` compat calls to direct Pinia stores (`dataset`, `analysis`, `metadata`).
- Replaced legacy action-helper usage in that page with local request helpers for metadata and timeseries retrieval.
- Completed migration of `app/pages/dataset/_id/visualize/_variable.vue` from `$api()` compat calls to direct Pinia stores (`app`, `dataset`, `metadata`) and local timeseries fetch helpers.
- Added shared interop composable `app/composables/useLegacyStoreActions.ts` and migrated remaining `$api()` consumers (`pages/index.vue`, `pages/dataset/_id/index.vue`, `components/dataset/Map.vue`, `components/dataset/LoadAnalysis.vue`) to direct store/composable usage.
- Removed `~/plugins/api-compat.ts` from `app/nuxt.config.ts` plugin wiring.
- Added persistence composable `app/composables/usePersistenceStorage.ts` and migrated all remaining `$warehouse` usage to direct persistence helpers.
- Removed `~/plugins/warehouse-compat.client.ts` from `app/nuxt.config.ts` plugin wiring.
- Validation: containerized `npm ci && npm exec vitest run` passed (12/12 tests).
- Removed retired compatibility assets: `app/plugins/api-compat.ts`, `app/plugins/warehouse-compat.client.ts`.
- Removed obsolete bridge-only test suite: `app/tests/api-compat.migrated.spec.ts`.
- Post-cleanup validation: containerized `npm ci && npm exec vitest run` passed (7/7 tests).
- Staging-like build verification uncovered migration blockers:
  - legacy Nuxt 2 config auto-selection (resolved by removing `app/nuxt.config.js`)
  - missing `nuxt-site-config` dependency for `@nuxtjs/robots` (resolved)
  - unresolved `nuxt-property-decorator` usage across class-style Vue components (open blocker for production build)
- Validation note: workspace shell currently lacks `npm`/`npx`, so full Vitest execution is blocked in this environment.

## Definition of Done (per task)
- All critical dataset routes work under Nuxt 3 with parity on user-facing behavior
- Store layer is fully migrated or bridge is documented and time-boxed
- Plugins/middleware/server runtime behavior validated in dev and staging
- Build/test/lint checks pass in CI for Nuxt 3 branch
- `.agent/handoffs/current.md` and migration checkpoint are updated
