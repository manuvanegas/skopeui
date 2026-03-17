# Domain Context

## Primary Domain
Dataset-centric discovery and exploration platform with metadata browsing, variable-level analysis, and visualizations.

## Core Concepts
- **Dataset**: top-level entity identified by route param `id`
- **Metadata**: descriptive fields and documentation for datasets/variables
- **Variable**: measurable field within a dataset
- **Study Area**: user-selected geometry used to gate visualize/analyze flows
- **Temporal Range**: selected year interval used for plotting and API requests
- **Analysis**: computed outputs for variables (statistics/derived insights)
- **Visualization**: map/time-series/other rendered representations

## User Journey (Typical)
1. Search or browse datasets
2. Open dataset details and metadata
3. Draw or upload a study area
4. Inspect variables
5. Run or view analysis/visualizations for a selected variable

## Domain Boundaries
- UI behavior: components/pages
- Data retrieval/state: Pinia stores + composables/plugins
- Cross-cutting user messages: `messages` store module and `Messages.vue`

## Current Product Rules
- Visualize/analyze routes are gated on `hasGeoJson` and should stay that way.
- Geometry persistence currently flows through `useLegacyStoreActions`.
- Circle study areas must be normalized to polygons before persistence or API submission.
- Frontend raster rendering is paused until the COG tile gateway contract is implemented.

## Glossary (Working)
- **Detail View**: dataset-specific route under `app/pages/dataset/[id]/`
- **Analysis View**: variable-focused route under `analyze/[variable].vue`
- **Visualization View**: variable-focused route under `visualize/[variable].vue`
- **Map Engine Flag**: URL/config switch that selects Leaflet or MapLibre in `Map.client.vue`
- **COG Flow**: future TileJSON-backed raster rendering path replacing legacy WMS behavior

## Open Questions Template
When domain assumptions are unclear, add entries here:
- Question:
- Current assumption:
- Impact if wrong:
- Owner/follow-up:
