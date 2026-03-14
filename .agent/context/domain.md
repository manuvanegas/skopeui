# Domain Context

## Primary Domain
Dataset-centric discovery and exploration platform with metadata browsing, variable-level analysis, and visualizations.

## Core Concepts
- **Dataset**: top-level entity identified by route param `_id`
- **Metadata**: descriptive fields and documentation for datasets/variables
- **Variable**: measurable field within a dataset
- **Analysis**: computed outputs for variables (statistics/derived insights)
- **Visualization**: map/time-series/other rendered representations

## User Journey (Typical)
1. Search or browse datasets
2. Open dataset details and metadata
3. Inspect variables
4. Run or view analysis/visualizations for selected variable

## Domain Boundaries
- UI behavior: components/pages
- Data retrieval/state: Vuex modules + plugins
- Cross-cutting user messages: `messages` store module and `Messages.vue`

## Glossary (Working)
- **Detail View**: dataset-specific route under `app/pages/dataset/_id/`
- **Analysis View**: variable-focused route under `analyze/_variable.vue`
- **Visualization View**: variable-focused route under `visualize/_variable.vue`

## Open Questions Template
When domain assumptions are unclear, add entries here:
- Question:
- Current assumption:
- Impact if wrong:
- Owner/follow-up:
