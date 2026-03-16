# Checkpoint: Nuxt 3 Plugin Migration Scaffold

Date: 2026-03-14
Status: completed (scaffold)

## Scope
Port plugin wiring from Nuxt 2 plugin conventions to Nuxt 3 `defineNuxtPlugin` scaffolding.

## Completed
- Added Nuxt 3 plugin registration in `app/nuxt.config.ts`.
- Added `app/plugins/download.ts` to provide `$download.saveAs`.
- Added `app/plugins/warehouse-compat.client.ts` to provide `$warehouse` persistence shim.
- Added `app/plugins/api-compat.ts` to preserve `$api()` access shape during incremental store migration.
- Added `app/plugins/leaflet.client.ts` with Vue 3 Leaflet component registration and `$L` injection.

## Notes
- `api-compat` is a transitional shim and intentionally does not replicate full legacy Vuex behavior.
- Legacy Nuxt 2 plugins remain in place for reference and should be removed after route/store migration completion.

## Next Actions
1. Replace `api-compat` shim with real Pinia-backed stores/composables.
2. Migrate components/pages using `$api()` and `$warehouse` to direct composable/store access.
3. Remove legacy plugin files once migration parity is confirmed.
