# Checkpoint: Pinia Dataset Cutover

Date: 2026-03-14
Status: completed (incremental migration)

## Scope
Move the `dataset` domain from compatibility-only state to a real Pinia store.

## Completed
- Added `app/stores/dataset.ts` with currently consumed dataset state and update actions.
- Routed `app/plugins/api-compat.ts` so `$api().dataset` now proxies to Pinia store values/actions.
- Preserved `$api().dataset` access shape to avoid breaking existing Vue 2-style component calls.

## Notes
- This cutover preserves current behavior while enabling deeper migration.
- Domain logic is still simplified vs legacy Vuex module and should be expanded as remaining pages/stores migrate.

## Next Actions
1. Migrate `metadata` domain from shim to Pinia.
2. Migrate `analysis` domain from shim to Pinia.
3. Begin replacing `$api()` usage with direct composable/store access in pages/components.
