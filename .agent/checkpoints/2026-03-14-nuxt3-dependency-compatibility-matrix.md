# Checkpoint: Nuxt 3 Dependency Compatibility Matrix

Date: 2026-03-14
Status: completed (planning artifact)

## Scope
Map current `app/package.json` dependencies to Nuxt 3 / Vue 3 compatibility status and define migration actions.

## Legend
- **Keep**: compatible as-is or with minor version bump
- **Upgrade**: keep package family but move to new major
- **Replace**: migrate to different package/module
- **Remove**: no longer needed in Nuxt 3 architecture
- **Verify**: compatibility unclear; confirm before implementation

## Matrix (Runtime Dependencies)
| Package | Current | Nuxt 3 Status | Action | Target / Notes | Priority |
|---|---:|---|---|---|---|
| `nuxt` | ^2.17.0 | Incompatible | Replace | Move to `nuxt@^3` and `nuxt.config.ts` | P0 |
| `vue` | ^2.6.12 | Incompatible | Upgrade | Vue 3 via Nuxt 3-managed version | P0 |
| `vue-server-renderer` | ^2.6.12 | Incompatible | Remove | SSR handled by Nuxt 3/Nitro | P0 |
| `vue-template-compiler` | ^2.6.12 | Incompatible | Replace | `@vue/compiler-sfc` (transitive via Nuxt 3 toolchain) | P0 |
| `vuex` | ^3.6.2 | Legacy | Replace | Prefer `@pinia/nuxt`; optional temporary Vuex bridge only if needed | P0 |
| `vuex-class` | ^0.3.2 | Incompatible pattern | Remove | Replace with Pinia/composable access patterns | P0 |
| `vuex-module-decorators` | ^1.0.1 | High-risk | Replace | Rewrite modules as Pinia stores/actions/getters | P0 |
| `nuxt-property-decorator` | ^2.9.1 | Incompatible | Remove | Convert class components to Composition API / `<script setup>` | P0 |
| `vue-class-component` | ^7.2.6 | Incompatible in current usage | Remove | Migrate to Composition API | P0 |
| `vue-property-decorator` | ^9.1.2 | Incompatible pattern | Remove | Migrate props/watch/computed to Composition API | P0 |
| `@nuxtjs/axios` | ^5.13.6 | Deprecated for Nuxt 3 | Replace | Nuxt `$fetch`/`ofetch` + custom API composable/plugin | P0 |
| `@nuxtjs/vuetify` | ^1.12.3 | Nuxt 2 module | Replace | Vuetify 3 integration via Nuxt 3-compatible module/plugin setup | P0 |
| `@nuxtjs/pwa` | ^3.3.5 | Nuxt 2 module | Replace | Nuxt 3-compatible PWA module (e.g., Vite PWA path) | P1 |
| `@nuxtjs/sentry` | ^6.0.1 | Likely outdated for Nuxt 3 | Replace | Use current Nuxt 3 Sentry integration (`@sentry/nuxt` path) | P1 |
| `@nuxtjs/markdownit` | ^2.0.0 | Nuxt 2 module | Replace | Keep `markdown-it` libs; provide custom Nuxt 3 plugin/composable | P1 |
| `@nuxtjs/hapi` | ^3.0.0 | Nuxt 2-specific | Remove | Use Nitro server routes or external service | P1 |
| `@hapi/hapi` | ^20.0.3 | Possibly unnecessary | Verify/Remove | Keep only if standalone server remains outside Nuxt runtime | P2 |
| `vue-warehouse` | ^2.2.0 | Vue 2 ecosystem | Replace | Use Pinia persisted state and/or `@vueuse/core` storage composables | P0 |
| `vue2-leaflet` | ^2.6.0 | Vue 2 only | Replace | Move to Vue 3 Leaflet package (`@vue-leaflet/vue-leaflet`) | P0 |
| `vue-gtag` | ^1.16.1 | Vue 2-focused | Replace | Nuxt 3 analytics module or Vue 3-compatible gtag package | P1 |
| `vue-plotly` | ^1.1.0 | Vue 2 wrapper | Replace | Vue 3-compatible Plotly wrapper or thin local wrapper around `plotly.js` | P1 |
| `leaflet` | ^1.7.1 | Compatible | Upgrade | Bump to current stable and re-test map interactions | P1 |
| `leaflet-draw` | ^1.0.4 | Compatible with caveats | Keep/Verify | Check browser bundling + typings under Vite | P1 |
| `plotly.js` | ^1.58.4 | Compatible | Upgrade | Move to current stable; validate bundle size/perf | P2 |
| `@turf/turf` | ^6.3.0 | Compatible | Keep/Upgrade | Verify tree-shaking under Vite | P2 |
| `circle-to-polygon` | ^2.0.2 | Compatible | Keep | No Nuxt coupling | P3 |
| `es6-dynamic-template` | 2.0.0 | Compatible | Keep/Verify | Verify usage and ESM compatibility | P3 |
| `file-saver` | ^2.0.5 | Compatible | Keep | Validate client-only loading | P3 |
| `json2csv` | ^5.0.5 | Compatible | Keep | Consider modern major when convenient | P3 |
| `jszip` | ^3.6.0 | Compatible | Keep | Client bundle impact check | P3 |
| `lodash` | ^4.17.20 | Compatible | Keep | Prefer per-function imports for bundle size | P2 |
| `markdown-it` | ^12.3.2 | Compatible | Keep | Use in Nuxt 3 plugin/composable | P2 |
| `markdown-it-attrs` | ^4.0.0 | Compatible | Keep | Pair with `markdown-it` plugin init | P2 |
| `markdown-it-div` | ^1.1.0 | Compatible | Keep | Pair with `markdown-it` plugin init | P2 |
| `mathjs` | ^9.3.2 | Compatible | Keep | Validate SSR/client execution paths | P3 |
| `papaparse` | ^5.3.1 | Compatible | Keep | No Nuxt coupling | P3 |
| `query-string` | ^7.0.0 | Compatible | Keep | Consider `ufo` for Nuxt-native URL utils where practical | P3 |
| `store` | ^2.0.12 | Compatible but redundant | Verify/Remove | May be superseded by new persistence strategy | P3 |
| `streamsaver` | ^2.0.5 | Compatible | Keep/Verify | Confirm browser support matrix | P3 |
| `web-streams-polyfill` | ^3.0.3 | Compatible | Keep/Verify | Keep only if needed by target browsers | P3 |
| `consola` | ^2.15.3 | Compatible | Keep | Works in Nuxt/Nitro contexts | P3 |
| `cross-env` | ^7.0.3 | Compatible | Keep | Script portability helper | P3 |
| `global` | ^4.4.0 | Likely unnecessary | Verify/Remove | Remove if no direct usage remains | P3 |
| `@nuxtjs/robots` | ^2.5.0 | Unknown for Nuxt 3 | Verify/Replace | Confirm Nuxt 3 robots module support | P2 |

## Matrix (Dev/Test/Build Dependencies)
| Package Group | Current | Nuxt 3 Status | Action | Target / Notes | Priority |
|---|---|---|---|---|---|
| Babel-era build deps (`@babel/*`, `babel-core`) | mixed | Mostly obsolete under Nuxt 3 | Remove/Minimize | Nuxt 3 + Vite handles transpilation | P1 |
| Webpack toolchain (`webpack`, `webpack-cli`, `eslint-loader`) | v4 era | Obsolete | Remove | Use Vite; move lint to eslint CLI | P0 |
| ESLint config (`@nuxtjs/eslint-config`, plugins) | Nuxt 2 oriented | Needs refresh | Replace/Upgrade | Nuxt 3 ESLint config path | P1 |
| Vue test stack (`@vue/test-utils@1`, `vue-jest`, `jest@26`) | Vue 2 stack | Replace | Move to Vue 3-compatible test stack (Vitest recommended) | P0 |
| Type packages (`@types/*`) | mixed | Mostly compatible | Keep/Upgrade | Re-evaluate after TS strategy is chosen | P3 |
| Prettier | 2.2.1 | Compatible | Upgrade | Align with modern ESLint integration | P3 |
| Nodemon | ^2.0.6 | Optional | Verify | Keep only if still needed in custom workflows | P3 |

## High-Risk Hotspots (Codebase Evidence)
- Class/decorator components are widespread (`nuxt-property-decorator`) across pages/components.
- Store access relies on `vuex-module-decorators` via plugin injection (`app/plugins/store.js`).
- Axios usage is centralized but present in store action flows (`app/plugins/axios.js`, `app/store/actions.js`).
- Map stack is tied to `vue2-leaflet` registration (`app/plugins/nuxt-leaflet.js`).
- Persistence behavior depends on `vue-warehouse` and `$warehouse` calls in dataset/terms flows.

## Recommended Decision Defaults
1. **State**: choose Pinia-first migration, no long-lived Vuex bridge.
2. **HTTP**: replace `$axios` with `$fetch` + centralized API composable to preserve call shape.
3. **Components**: migrate to Composition API with focused route-by-route refactors.
4. **Maps**: move to Vue 3 Leaflet package early to unblock visualization pages.
5. **Testing**: adopt Vitest + Vue Test Utils v2 during migration, not post-migration.

## Validation Gates for This Matrix
- [ ] Confirm Nuxt 3 compatibility for `@nuxtjs/robots` path.
- [ ] Decide and lock Vuetify migration path (module and version).
- [ ] Decide analytics integration target (Nuxt module vs Vue plugin).
- [ ] Confirm whether `@hapi/hapi` is needed after Nitro migration.
