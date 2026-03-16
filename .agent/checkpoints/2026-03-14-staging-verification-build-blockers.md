# Checkpoint: Staging Verification Build Blockers

## Date
2026-03-14

## Scope
- Execute staging-like production verification after compatibility asset cleanup.

## Validation Steps and Outcomes
1. Containerized `npm ci && npm run build` (initial):
   - Failed due to Nuxt loading legacy `app/nuxt.config.js` (expected `@nuxtjs/axios`).
   - Mitigation applied: removed `app/nuxt.config.js` and stale `require` in `app/server/index.js`.
2. Containerized `npm ci && npm run build` (retry):
   - Failed due to missing `nuxt-site-config` dependency required by `@nuxtjs/robots`.
   - Mitigation applied: added `nuxt-site-config` dependency.
3. Containerized `npm ci && npm run build` (retry):
   - Failed on unresolved import `nuxt-property-decorator` in class-style SFCs (first failure: `app/layouts/DefaultLayout.vue`).

## Additional Cleanup During Verification
- Removed obsolete Nuxt 2 plugin files still auto-scanned by Nuxt 3:
  - `app/plugins/axios.js`
  - `app/plugins/download.js`
  - `app/plugins/nuxt-leaflet.js`
  - `app/plugins/store.js`
  - `app/plugins/vue-gtag.js`
- Added temporary parser support for legacy decorators in `app/nuxt.config.ts`:
  - `vite.vue.script.babelParserPlugins = ["decorators-legacy"]`

## Current Blocker
- Production build cannot complete until remaining class-style components are migrated or a temporary compatibility approach for `nuxt-property-decorator` is introduced.

## Recommended Next Action
- Prioritize migration of `nuxt-property-decorator` components to Vue 3-compatible component/composable patterns, starting with `app/layouts/DefaultLayout.vue` and route-critical pages/components.
