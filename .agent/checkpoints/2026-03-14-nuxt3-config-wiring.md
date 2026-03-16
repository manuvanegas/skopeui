# Checkpoint: Nuxt 3 Config Wiring

Date: 2026-03-14
Status: completed (migration scaffold)

## Scope
Create baseline `nuxt.config.ts` wiring for the selected Nuxt 3 modules.

## Completed
- Added `app/nuxt.config.ts` with Nuxt 3 module wiring:
  - `@pinia/nuxt`
  - `vuetify-nuxt-module`
  - `@nuxtjs/robots`
  - `nuxt-gtag`
  - `@sentry/nuxt`
- Migrated core page head metadata/link defaults from Nuxt 2 config.
- Added runtime config stubs for Sentry DSN and gtag ID.
- Added baseline global CSS wiring for existing theme variables and Leaflet styles.

## Notes
- This is scaffolding only; legacy Vue 2 plugin/store/page code still needs route-by-route migration.
- Existing `app/nuxt.config.js` is retained for historical reference during cutover.

## Next Actions
1. Migrate plugin layer to Nuxt 3 plugin format (`defineNuxtPlugin`).
2. Replace Vuex/decorator usage with Pinia/composables.
3. Port page data loading to `useAsyncData`/`useFetch`.
