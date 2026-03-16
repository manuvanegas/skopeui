# Checkpoint: Nuxt 3 Target Package (Resolved)

Date: 2026-03-14
Status: completed (planning artifact)

## Scope
Resolve remaining package decisions from the draft matrix and produce a ready-to-apply Nuxt 3 package manifest.

## Output
- Resolved manifest: `app/package.nuxt3.ready.json`
- Prior draft retained: `app/package.nuxt3.draft.json`

## Finalized Decisions
- **State**: Pinia-first (`@pinia/nuxt`, `pinia`)
- **Analytics**: `nuxt-gtag`
- **Robots**: `nuxt-simple-robots`
- **UI framework**: Vuetify 3 path (`vuetify`, `vuetify-nuxt-module`, `vite-plugin-vuetify`)
- **Sentry**: `@sentry/nuxt`
- **PWA**: `@vite-pwa/nuxt`

## Notes
- This manifest is intentionally separate from `app/package.json` to support review before replacement.
- Module APIs and configuration keys still need implementation in `nuxt.config.ts` during foundation setup.

## Next Actions
1. Replace `app/package.json` with `app/package.nuxt3.ready.json` when implementation starts.
2. Run install and lockfile generation on migration branch.
3. Add `nuxt.config.ts` module wiring for robots, analytics, Vuetify, Pinia, and Sentry.
