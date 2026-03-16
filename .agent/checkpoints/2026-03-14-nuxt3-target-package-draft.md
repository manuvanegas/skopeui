# Checkpoint: Nuxt 3 Target Package Draft

Date: 2026-03-14
Status: completed (planning artifact)

## Scope
Create a concrete Nuxt 3 target package manifest draft based on the compatibility matrix.

## Output
- Draft manifest: `app/package.nuxt3.draft.json`

## Key Decisions Encoded
- Nuxt 3 + Pinia-first state strategy
- Replace Vue 2 and Nuxt 2 module ecosystem (`@nuxtjs/*`, decorator/class stack)
- Move test tooling toward Vitest + Vue Test Utils v2
- Include Vue 3-compatible map stack baseline (`@vue-leaflet/vue-leaflet`)

## Review Notes
- Versions are intentionally draft-level and should be resolved with lockfile validation.
- `robots` and analytics integrations are not pinned in this draft pending final module selection.
- If Hapi runtime behavior remains required, treat it as a separate service concern (not Nuxt runtime).

## Next Actions
1. Validate module choices for robots + analytics.
2. Confirm Vuetify 3 integration package and add to draft.
3. Generate final `app/package.json` + lockfile update in migration branch.
