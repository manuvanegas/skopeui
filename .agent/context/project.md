# Project Overview

## Purpose
SkopeUI is a Nuxt/Vue frontend for paleoclimate dataset discovery, study-area selection, analysis, and visualization.

## Tech Stack
- Nuxt 3 (Vue 3)
- Pinia domain stores
- Vuetify + SCSS theme variables
- Plotly.js for current time-series rendering
- MapLibre GL JS + maplibre-geoman-free for the active map migration path
- Nuxt plugins/composables and Nitro runtime

## High-Level Architecture
- `app/pages/`: route-level views and dataset flows
- `app/components/`: reusable UI components (global + dataset-specific)
- `app/stores/`: Pinia domain stores (`dataset`, `analysis`, `metadata`, etc.)
- `app/store/modules/`: legacy Vuex modules retained during migration cleanup
- `app/plugins/`: app bootstrap and framework integrations
- `app/composables/`: cross-cutting reusable app logic
- `app/server/`: local backend/SSR runtime hooks
- Root `*.yml`: environment deployment configs (dev/staging/prod)

## Current Frontend State
- `Map.client.vue` is a feature-flagged adapter between Leaflet and MapLibre.
- MapLibre is the active migration target and currently handles study-area drawing/editing plus basemap switching.
- Visualize mode is intentionally rasterless until the COG/TileJSON flow is implemented.
- Time-series rendering uses a local Plotly wrapper instead of an external Vue Plotly package.

## Runtime Data Flow
1. Route in `pages/` loads context (dataset, variable, etc.)
2. Page/composable actions fetch and normalize API responses
3. Pinia stores expose derived state to components
4. Components render map state, time-series views, controls, and messages

## Key Constraints
- Preserve existing route contracts under `app/pages/dataset/[id]/*`
- Keep domain store boundaries clear (avoid cross-store side effects)
- Prefer plugin/store integrations over ad hoc global state
- Keep generated build artifacts out of source directories (`app/generated/`)
- Do not reintroduce legacy GeoServer/WMS frontend paths; raster work should target COG/TileJSON.
- All npm/node commands run inside the Docker `web` container.

## Agent Working Notes
- Start with smallest safe change in existing patterns
- Update adjacent docs/state files in `.agent/` for non-trivial changes
- Record meaningful milestones in `.agent/checkpoints/`
