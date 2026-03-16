# Current Handoff

Latest continuation handoff: [handoff.md](./handoff.md)

## Session Summary
- Generated build artifact isolation is now configured:
	- Nuxt build cache/output now target `app/generated/.nuxt` and `app/generated/.output`
	- Git/Docker ignore rules updated so generated output does not pollute source directory status
- Core agent context docs refreshed for current Nuxt 3 + Pinia architecture and `[id]/[variable]` route conventions.
- Nuxt 3 migration branch is active and foundational migration scaffolding is in place.
- Package manager migration to npm is complete (`package-lock.json` exists, `yarn.lock` removed).
- Nuxt 3 config and plugin scaffolding completed (`nuxt.config.ts`, plugin shims).
- Pinia stores are in place for `app`, `messages`, `dataset`, `metadata`, and `analysis`.
- Direct consumer migration started and completed for selected components:
	- `Header.vue`, `Navigation.vue`, `Messages.vue`, `dataset/SubHeader.vue`
	- dataset-heavy components: `dataset/Map.vue`, `dataset/TimeSeriesPlot.vue`
- Metadata consumer migration completed for:
	- `dataset/MetadataModal.vue`, `dataset/Search.vue`, `pages/index.vue`
- Analysis page migration completed for:
	- `pages/dataset/_id/analyze/_variable.vue` (removed `$api()` usage; direct Pinia + fetch-based requests)
- Visualize page migration completed for:
	- `pages/dataset/_id/visualize/_variable.vue` (removed `$api()` usage; direct Pinia + fetch-based requests)
- Shared helper/page migration completed for:
	- `composables/useLegacyStoreActions.ts`
	- `pages/index.vue`, `pages/dataset/_id/index.vue`
	- `components/dataset/Map.vue`, `components/dataset/LoadAnalysis.vue`
- Compatibility bridge plugin has been unwired from `nuxt.config.ts`; no `$api()` call sites remain in `app/**/*.{vue,js,ts}`.
- Persistence migration completed:
	- `composables/usePersistenceStorage.ts` added
	- All `$warehouse` call sites migrated off plugin injection
	- `warehouse-compat.client.ts` unwired from `nuxt.config.ts`
- Compatibility asset cleanup completed:
	- Deleted `plugins/api-compat.ts` and `plugins/warehouse-compat.client.ts`
	- Deleted obsolete `tests/api-compat.migrated.spec.ts`
- Staging-like verification progress:
	- fixed config selection by removing `app/nuxt.config.js`
	- added missing dependency `nuxt-site-config` required by `@nuxtjs/robots`
	- production build still blocked by unresolved `nuxt-property-decorator` imports in class-style Vue SFCs

## Active Goal
- Unblock Nuxt 3 production build by resolving class-style component dependency path (`nuxt-property-decorator`) and continue staging-like route verification.

## Current Branch / Environment
- Branch: `nuxt-3-upgrade`
- Environment (dev/staging/prod): dev (local migration branch)

## Latest Changes
- Key files edited:
	- `app/nuxt.config.ts`, `app/.gitignore`, `app/.dockerignore`, `.gitignore`, `.dockerignore`
	- `.agent/context/project.md`, `.agent/context/conventions.md`, `.agent/context/domain.md`
	- `.agent/tasks/active.md`, `.agent/handoffs/current.md`
	- `app/package.json`, `app/package-lock.json`, `app/nuxt.config.ts`
	- `app/plugins/api-compat.ts`, `app/plugins/download.ts`, `app/plugins/warehouse-compat.client.ts`, `app/plugins/leaflet.client.ts`
	- `app/stores/app.ts`, `app/stores/messages.ts`, `app/stores/dataset.ts`, `app/stores/metadata.ts`, `app/stores/analysis.ts`
	- `app/components/Header.vue`, `app/components/Navigation.vue`, `app/components/Messages.vue`
	- `app/components/dataset/SubHeader.vue`, `app/components/dataset/Map.vue`, `app/components/dataset/TimeSeriesPlot.vue`
	- `app/components/dataset/MetadataModal.vue`, `app/components/dataset/Search.vue`, `app/pages/index.vue`
	- `app/pages/dataset/_id/analyze/_variable.vue`
	- `app/pages/dataset/_id/visualize/_variable.vue`
	- `app/pages/dataset/_id/index.vue`, `app/pages/index.vue`
	- `app/components/dataset/LoadAnalysis.vue`
	- `app/composables/useLegacyStoreActions.ts`
	- `app/composables/usePersistenceStorage.ts`
	- `app/components/TermsOfUse.vue`
	- `app/tests/stores.migrated.spec.ts`, `app/tests/api-compat.migrated.spec.ts`, `app/vitest.config.ts`
	- ops updates: `app/Dockerfile`, `dev.yml`, `staging.yml`, `prod.yml`, `Makefile`, `app/README.md`
- Behavior impact:
	- Runtime page/component flows are now direct-store/composable-driven for former `$api()` and `$warehouse` call sites.
	- Current tests validate migrated domains; compatibility-plugin tests remain as cleanup candidates.
	- App is not fully Nuxt 3-ready yet; remaining legacy Vue2/decorator/page patterns still exist.

## Pending Decisions
- Decision: cleanup strategy for compatibility artifacts (`plugins/api-compat.ts`, `plugins/warehouse-compat.client.ts`, related bridge tests).
- Options:
	- Remove compatibility assets now and update tests in one cleanup pass.
	- Keep assets temporarily (unwired) until runtime smoke checks on staging-like flow are complete.
- Recommended default:
	- Keep assets one short cycle for safety, then remove with focused test updates.

- Decision: handling Hapi runtime dependency post-Nuxt 3 cutover.
- Options:
	- Externalize remaining Hapi behavior into separate service.
	- Port needed behavior to Nitro server routes.
- Recommended default:
	- Externalize if possible; use Nitro routes only for functionality required in Nuxt runtime.

## Next Actions (Ordered)
1. Resolve `nuxt-property-decorator` migration gap (component refactor or temporary compatibility path) to unblock `nuxt build`.
2. Re-run staging-like runtime verification for dataset select/visualize/analyze flows after build is green.
3. Add focused tests for persistence composable behavior and route-level storage restore flows.
4. Confirm whether any Hapi runtime behavior must remain externalized.

## Verification Checklist
- [x] Reproduce current issue/task
- [x] Apply targeted change
- [x] Run relevant tests/checks
- [x] Update `.agent/tasks/active.md`
- [ ] Archive handoff when complete

## Validation Snapshot

- Latest successful prior run (containerized): `npx vitest run` summary
	- `numTotalTestSuites 4`
	- `numPassedTestSuites 4`
	- `numTotalTests 12`
	- `numPassedTests 12`
	- `success true`
- Latest run in this session (containerized): `npm ci && npm exec vitest run`
	- `Test Files 2 passed`
	- `Tests 12 passed`
- Latest post-cleanup run in this session (containerized): `npm ci && npm exec vitest run`
	- `Test Files 1 passed`
	- `Tests 7 passed`
- Latest staging-like build verification in this session:
	- `npm run build` currently fails on `nuxt-property-decorator` import resolution in class-style SFCs (first failure: `layouts/DefaultLayout.vue`).
- Current workspace validation note:
	- `npm`/`npx` are unavailable in the current shell, so tests could not be rerun locally in this session.

## Known Risks
- Security advisory GHSA-5c6j-r48x-rmvq (`serialize-javascript`) remains ecosystem-level via Nuxt/Nitro dependency chain; tracked in checkpoint `2026-03-14-nuxt3-package-apply-step.md`.
- Residual risk is now concentrated in leftover legacy assets/tests and remaining Vue2/decorator patterns, not runtime `$api()`/`$warehouse` dependency.
