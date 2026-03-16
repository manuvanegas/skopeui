# Checkpoint: Pinia App/Messages Cutover

Date: 2026-03-14
Status: completed (incremental migration)

## Scope
Begin replacing the compatibility-only API shim with real Pinia stores.

## Completed
- Added `app/stores/app.ts` using Pinia for navigation and visit state.
- Added `app/stores/messages.ts` using Pinia for message queue actions.
- Updated `app/plugins/api-compat.ts` so `$api().app` and `$api().messages` proxy to Pinia stores.
- Kept `$api().dataset`, `$api().metadata`, and `$api().analysis` on temporary shim state for phased migration.

## Notes
- Existing components can continue using `$api()` while internals are migrated incrementally.
- This keeps behavioral churn low while establishing real Nuxt 3 store infrastructure.

## Next Actions
1. Migrate `dataset` domain to Pinia and route `$api().dataset` to the new store.
2. Migrate `metadata` and `analysis` domains similarly.
3. Remove `api-compat` plugin once all domains are Pinia/composable-backed.
