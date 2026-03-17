# AGENTS.md — SkopeUI Agent Reference

Authoritative context for AI agents working in this repo.
Sync this file to `.github/copilot-instructions.md` (compressed) when making structural changes.

---

## Project Overview

**SkopeUI** is a Nuxt 3 single-page application for spatiotemporal paleoclimate dataset discovery, visualization, and analysis. It is the frontend for the SKOPE (Synthesizing Knowledge of Past Environments) platform.

Core user workflow:
1. Browse/search datasets on the index page.
2. Select a dataset to view its metadata detail page.
3. Draw or upload a study area (polygon/circle/point) on an interactive map.
4. Navigate to `/visualize/:variable` to view a WMS/COG raster map of a selected variable.
5. Navigate to `/analyze/:variable` to fetch and plot a time-series analysis for the selected area.

---

## Stack

| Layer | Current | Target |
|---|---|---|
| Framework | Nuxt 3 (Vue 3, TypeScript) | same |
| UI | Vuetify 3 | same |
| State | Pinia stores (`app/stores/`) + legacy Vuex-style (`app/store/`) | migrate fully to Pinia |
| Map | Leaflet + leaflet-draw | **MapLibre GL JS + maplibre-geoman-free** |
| Raster source | none in frontend until COG integration lands | **COG tiles via FastAPI gateway** |
| Package manager | npm (inside Docker container) | same |
| Test runner | Vitest + `@nuxt/test-utils` | same |

---

## Directory Structure

```
app/
  components/dataset/
    LeafletMap.client.vue       # Legacy map (keep as fallback until cutover)
    Map.client.vue              # Adapter: renders Leaflet or MapLibre based on engine flag
    MapLibrePoc.client.vue      # Active migration target — MapLibre + geoman
    MetadataDetail.vue
    Search.vue
    TimeSeriesPlot.vue
    VariableList.vue
  composables/
    useLegacyStoreActions.ts    # Bridge: legacy Vuex-style actions → Pinia stores
    useMapInitialViewport.ts
    usePersistenceStorage.ts    # localStorage persistence with SSR safety
  pages/dataset/[id]/
    index.vue                   # Dataset detail + map (study area selection)
    visualize/[variable].vue    # Raster map view
    analyze/[variable].vue      # Time-series analysis + plot
  stores/                       # Pinia stores (authoritative state)
    app.ts
    dataset.ts
    metadata.ts
    messages.ts
    analysis.ts
  store/                        # Legacy store (Vuex-style, being phased out)
    actions.js
    modules/
      constants.js              # API endpoint constants (gitignored template exists)
      dataset.js
      metadata.js
  nuxt.config.ts                # Runtime config including `public.mapEngine`
  package.json
  tests/
    pages/                      # Route-level integration tests
    composables/
```

---

## Dev Environment

> **All npm/node commands must run inside the Docker container.** npm is not installed on the host.

```bash
# Run tests (preferred form)
docker compose -f base.yml -f dev.yml run --rm web npm exec vitest run tests/pages/dataset-id.spec.ts

# Run all tests
docker compose -f base.yml -f dev.yml run --rm web npm run test

# Type check
docker compose -f base.yml -f dev.yml run --rm web npm run typecheck

# Dev server
docker compose -f base.yml -f dev.yml up
```

Gitignored but required: `app/store/modules/_constants.js` — copy from `_constants.js.template` and fill in API URLs before running.

---

## State Architecture

Two parallel state systems exist during migration:

**Pinia stores** (`app/stores/*.ts`) — authoritative for new code.
**Legacy store** (`app/store/`) — Vuex-style modules, still called by some components via `useLegacyStoreActions`.

Key dataset state (in `useDatasetStore`):
- `geoJson` / `hasGeoJson` — the user's selected study area
- `variable` — the active dataset variable
- `temporalRange` — selected year range `[min, max]`
- `timeSeries`, `timeSeriesRequestStatus` — analysis fetch state

Key actions via `useLegacyStoreActions`:
- `initializeDatasetGeoJson(datasetId)` — rehydrate study area from persistence
- `saveGeoJson(geoJson)` — persist + commit study area
- `clearGeoJson()` — reset study area

---

## Map Engine Architecture

A feature-flagged hybrid is active:

```
Map.client.vue (adapter)
  ├── engine = "leaflet"  → LeafletMap.client.vue  (default)
  └── engine = "maplibre" → MapLibrePoc.client.vue  (opt-in)
```

Engine selection precedence:
1. URL query param `?map_engine=maplibre|leaflet`
2. `nuxt.config.ts` → `runtimeConfig.public.mapEngine` (defaults to `"leaflet"`)

**Current state:** MapLibrePoc renders, geoman draw/edit/remove is wired for study-area selection, persisted geometry is imported into geoman for editability, MapLibre supports base-layer selection parity (CartoDB/Esri providers), and raster rendering is intentionally absent until the COG tile flow is implemented.

---

## Migration Roadmap (PR Sequence)

| PR | Scope | Files | Status |
|---|---|---|---|
| PR-01 | Restore MapLibre basemap + geoman controls visible | `MapLibrePoc.client.vue`, `package.json` | **done** |
| PR-02 | Draw tools parity (point, polygon, circle) | `MapLibrePoc.client.vue` | **done** |
| PR-03 | Circle → polygon normalization + persistence | `MapLibrePoc.client.vue`, `useLegacyStoreActions.ts`, `stores/dataset.ts` | not started |
| PR-04 | COG metadata contract extension | `stores/metadata.ts`, `store/modules/metadata.js` | not started |
| PR-05 | COG raster layer resolver | `MapLibrePoc.client.vue` | not started |
| PR-06 | Workflow parity (select → visualize → analyze) | page files | not started |
| PR-07 | Tests for MapLibre mode | `tests/` | in progress (`tests/components/maplibre-baselayer.spec.ts`) |
| PR-08 | Feature-flag flip, Leaflet removal | `nuxt.config.ts`, map components | not started |

---

## COG Raster Architecture (Target)

Implement a **FastAPI COG tile gateway** (in skope-api):

- `GET /v2/map/tilejson/{dataset_id}/{variable_id}?year=&colormap=&rescale=`  
  Returns TileJSON with a `{z}/{x}/{y}.png` tiles template.
- `GET /v2/map/tiles/{dataset_id}/{variable_id}/{z}/{x}/{y}.png`  
  Renders PNG tile from COG source.

Client constructs MapLibre raster sources from tilejson responses. Metadata for each variable must include:
- `cog_path_template` (or `cog_static_path`)
- `time_resolution`, `time_origin`, `time_bounds`
- `default_render`: `{ band, rescale, colormap, nodata }`
- `overviews_available` flag

**S3 COG paths** (reference, not accessed directly by client in target arch):
```
https://skope.s3.us-west-2.amazonaws.com/paleocar_v2/gdd_maize_maysept/prediction_scaled.tif
https://skope.s3.us-west-2.amazonaws.com/paleocar_v3/ppt_wateryear/prediction.tif
# Listing: http://skope.s3-website-us-west-2.amazonaws.com/
```

---

## Key Conventions

- **Client-only components** use `.client.vue` suffix (map libraries require browser APIs).
- **New state** goes in Pinia stores (`app/stores/`). Do not add to legacy `app/store/`.
- **Geometry persistence** always goes through `useLegacyStoreActions` until the full store migration is complete — do not write localStorage directly.
- **Single study feature** — the map enforces at most one active geometry at a time.
- **Circle → polygon conversion** must happen before storing/sending to the API (API does not accept GeoJSON `Circle`).
- Frontend raster work should target TileJSON/COG responses; do not reintroduce legacy raster endpoints.
- **Route guards** gate visualize/analyze on `hasGeoJson`; do not remove this check.

---

## Architecture Decision Guidance

When proposing architecture changes:
- Prefer reversible, feature-flagged rollouts over hard cutovers.
- Keep Leaflet default until MapLibre parity is fully validated in production.
- The COG tile gateway (server-side) is preferred over direct S3 COG access from the client — avoids CORS/auth/band-selection complexity at the client.
- Do not add legacy raster dependencies; the migration direction is COG-only.
- New page-level features belong in Pinia stores, not the legacy store.

---

## Handoff

Active handoff state is stored in `.agent/handoffs/handoff.md`. Read it at session start when resuming work. Delete it after task completion.
