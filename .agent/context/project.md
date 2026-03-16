# Project Overview

## Purpose
SkopeUI is a Nuxt/Vue frontend for dataset discovery, metadata exploration, analysis, and visualization.

## Tech Stack
- Nuxt 3 (Vue 3)
- Pinia domain stores
- Vuetify + SCSS theme variables
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

## Runtime Data Flow
1. Route in `pages/` loads context (dataset, variable, etc.)
2. Page/composable actions fetch and normalize API responses
3. Pinia stores expose derived state to components
4. Components render views, controls, and messages

## Key Constraints
- Preserve existing route contracts under `app/pages/dataset/[id]/*`
- Keep domain store boundaries clear (avoid cross-store side effects)
- Prefer plugin/store integrations over ad hoc global state
- Keep generated build artifacts out of source directories (`app/generated/`)

## Agent Working Notes
- Start with smallest safe change in existing patterns
- Update adjacent docs/state files in `.agent/` for non-trivial changes
- Record meaningful milestones in `.agent/checkpoints/`
