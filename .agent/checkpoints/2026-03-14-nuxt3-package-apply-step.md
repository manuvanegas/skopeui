# Checkpoint: Nuxt 3 Package Apply Step

Date: 2026-03-14
Status: partial (manifest applied, lockfile pending)

## Scope
Apply resolved Nuxt 3 package manifest to the active package file.

## Completed
- Replaced `app/package.json` with Nuxt 3 ready manifest content from `app/package.nuxt3.ready.json`.
- Switched project from Yarn to npm (`yarn.lock` removed, `package-lock.json` generated).
- Updated all operational commands to npm: `dev.yml`, `prod.yml`, `staging.yml`, `Makefile`, `app/Dockerfile`, `app/README.md`.
- Resolved all invalid/outdated version pins: `pinia@^3.0.4`, `vuetify@^4.0.2`, `@pinia/nuxt@^0.11.3`, `nuxt-gtag@^4.1.0`, `vuetify-nuxt-module@^0.19.5`, `@sentry/nuxt@^10.43.0`.
- Replaced deprecated `nuxt-simple-robots` with official `@nuxtjs/robots@^5.7.1`.
- Removed `@vite-pwa/nuxt` to eliminate avoidable CVE path (GHSA-5c6j-r48x-rmvq via workbox).
- Generated `package-lock.json` (v3, 1695 packages) via `node:lts-bookworm` Docker container.

## Pending
- Restore PWA support once a safe `@vite-pwa/nuxt` or Nuxt 3 PWA path is available.

## Known Security Issue (Tracked)
- GHSA-5c6j-r48x-rmvq: `serialize-javascript <= 7.0.2` in `nitropack` → all current nuxt 3.x versions.
- This is embedded in the nuxt build chain (rollup plugin terser), not runtime-exposed code.
- No safe nuxt 3.x version is currently published. Track upstream fix and repin nuxt when resolved.
- Once a fixed nuxt version is available, update `package.json` nuxt pin to remove `"3.19.3"` exact lock.

## Resume Commands
- Lockfile generation complete. Next: `nuxt.config.ts` with module wiring.

## Next Action
- Implement `nuxt.config.ts` with module wiring (Pinia, Vuetify, `@nuxtjs/robots`, `nuxt-gtag`, Sentry).
