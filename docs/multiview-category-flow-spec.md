# Multiview Category Flow Spec (MVP)

## Status
- Phase: MVP in progress (partially implemented)
- Stack now: hybrid (`src/` legacy vanilla JS + `src-react/` React multiview island)
- Planned later: continue migrating categories/routing UI to React

Implemented already:
- `/` categories page with curated taxonomy tag filters
- `/categories/:id` category channel list (live channels)
- `Watch` -> `/multiview` navigation with seeded streamer + category context
- Multiview sidebar reloaded from selected category context
- Search parsing for `twitch.tv/<streamer_name>` in multiview input

## Goal
Separate responsibilities between pages:
- `/categories` -> choose category
- `/categories/:id` -> choose streamer inside category
- `/multiview` (or current Directory route/page) -> watch and add more streamers

## Product Flow (MVP)
1. User opens site -> sees categories + category tag filters.
2. User selects category -> opens `/categories/:id`.
3. User sees streamer list for that category (compact list/table).
4. User clicks `Watch` on a streamer.
5. App navigates to multiview page and starts with 1 player slot containing selected streamer.
6. In multiview sidebar, app shows streamers from the same category (context preserved).
7. User adds more streamers via `Add` inside multiview.

## Page Responsibilities

### `/categories`
- Category cards/grid
- Category filters (curated taxonomy tags, AND logic)
- Category sorting (popular / less popular)

### `/categories/:id`
- Main content: streamer list for selected category
- Sidebar: streamer filters (language, sort, etc.)
- Actions per streamer:
  - `Watch` (primary): open multiview with this streamer as seed
  - `Open` (optional secondary): open channel page in new tab
- No multiview player grid on this page (by design for MVP)

### `/multiview`
- Player layout templates (1/2/3/4)
- Adaptive layout rules:
  - 1 slot: fills available workspace
  - 2 slots: split workspace evenly
  - 3 slots: active slot is large, two others are stacked
  - 4 slots: 2x2 split
- Focus mode / dock controls
- Sidebar:
  - streamers from current selected category (if opened from category flow)
  - Add actions to fill slots
  - search field by channel login (`twitch.tv/<streamer_name>`)
  - infinite scroll via Twitch pagination cursor

## Navigation Contract (Category -> Multiview)
Multiview must receive enough context to keep category-based browsing available.

Minimum payload:
- `categoryId`
- `categoryName`
- `seedStreamerId` (internal stream item id, e.g. `twitch-ramzes`)

Recommended URL shape (example):
- `/multiview?categoryId=29595&categoryName=Dota%202&seed=twitch-ramzes`

Notes:
- `categoryName` is for UI display only.
- `categoryId` is the authoritative key for reloading streamer list.

## Multiview Sidebar Behavior

### If opened from category page
- Load streamer list for the same category.
- Keep category context visible in UI (e.g. `Dota 2` label).
- `Add` adds selected streamer to first free slot.

### If opened without category context (future/manual entry)
- Sidebar can show generic search results or fallback list.
- Category-specific list is unavailable.

## Streamer Actions Semantics (MVP)

### On `/categories/:id`
- `Watch`:
  - navigates to multiview
  - starts multiview with 1 active player (selected streamer)
- `Open`:
  - opens original Twitch channel page

### On `/multiview`
- `Add`:
  - adds to first free slot
  - if full (4/4), future behavior: prompt replace target slot
- `Clear`:
  - removes selected slot content
  - compacts remaining streams left-to-right (no empty leading slots)
- `Watch` (optional in sidebar later):
  - replace active slot and focus it

### Keyboard on `/multiview`
- Digits are constrained by visible slot count:
  - 1 visible slot: `1-4` ignored
  - 2 visible slots: `1-2` active
  - 3 visible slots: `1-3` active
  - 4 visible slots: `1-4` active

## Search in Multiview (by Twitch channel login)

Goal:
- Let user quickly add a streamer by known Twitch login (`streamer_name` in `twitch.tv/streamer_name`)

### UX (MVP)
- Single input in multiview sidebar:
  - placeholder: `Find by Twitch login...`
- Input examples:
  - `ramzes`
  - `https://www.twitch.tv/ramzes` (future parsing support)

### Suggested behavior (incremental)
1. First search in current category streamer list (client-side filter).
2. If not found:
   - show "No match in current category"
   - later add direct Twitch lookup flow (server endpoint)

### Why staged rollout
- Fast to implement now (local filter only)
- No extra API complexity
- Keeps user in category context

## UX Risks / Constraints
- User may expect adding more streamers directly from `/categories/:id`.
  - MVP decision: keep `Add` only in multiview for simpler separation.
- Extra navigation step to multiview.
  - Mitigation: preserve category context and provide `Back to category` action in multiview.

## Future (after MVP)
- Complete TypeScript + React migration
- Route formalization (`/multiview`, `/categories/:id`)
- Shared typed models for:
  - Category
  - Streamer
  - Multiview session context
- Persisted multiview session in URL/localStorage
- User playlists/presets (save reusable multiview sets: selected streamers + layout + optional category context)
