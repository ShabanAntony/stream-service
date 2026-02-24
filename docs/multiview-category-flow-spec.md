# Multiview Category Flow Spec (MVP)

## Status
- Phase: MVP in progress (partially implemented)
- Stack now: vanilla JS
- Planned later: TypeScript + React refactor
- Sandbox mode: `read-only` (current agent environment mode)

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
- Focus mode / dock controls
- Sidebar:
  - streamers from current selected category (if opened from category flow)
  - Add actions to fill slots
  - search field by channel login (`twitch.tv/<streamer_name>`)

## Navigation Contract (Category -> Multiview)
Multiview must receive enough context to keep category-based browsing available.

Minimum payload:
- `categoryId`
- `categoryName`
- `seedStreamerId` (internal stream item id, e.g. `twitch-ramzes`)
- `platform` (future-proofing; `twitch` for now)

Recommended URL shape (example):
- `/multiview?categoryId=29595&categoryName=Dota%202&seed=twitch-ramzes&platform=twitch`

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
- `Watch` (optional in sidebar later):
  - replace active slot and focus it

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
- TypeScript + React refactor
- Route formalization (`/multiview`, `/categories/:id`)
- Shared typed models for:
  - Category
  - Streamer
  - Multiview session context
- Persisted multiview session in URL/localStorage
- User playlists/presets (save reusable multiview sets: selected streamers + layout + optional category context)
