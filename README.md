# Stream Hub

Stream Hub is a lightweight, self-hosted multiview hub for watching up to four live streams (Twitch based) side by side.

Current UX flow is split into clear stages:
- `/` -> categories browser
- `/categories/:id` -> channels inside a category
- `/multiview` -> player grid and stream comparison

## Highlights

- **Separated browsing flow**: categories, category channels, and multiview are separate pages with distinct responsibilities.
- **Multiview (up to 4 slots)**: 2x2 player grid with slot targeting, focus mode, and dock controls.
- **Slot targeting sync**: header buttons `1-4`, keyboard digits, and clicked slots stay synchronized.
- **Focus mode**: active (and hovered) slot stays visible while other slots blur/desaturate.
- **Category taxonomy filters**: categories use curated local tags (`src/data/category-taxonomy.json`) with AND filtering.
- **Category channels page**: `/categories/:id` shows a compact live channel list and `Watch` action.
- **Context-aware multiview**: when opened from a category, multiview sidebar shows channels from that same category.
- **Search by Twitch login**: multiview search accepts `streamer_name` and Twitch URLs like `https://twitch.tv/streamer_name`.
- **Fallback data**: UI remains usable if live API requests fail.

## Getting Started

1. Run `npm install`
2. Copy `.env.example` to `.env`
3. Fill required variables:
   - `TWITCH_CLIENT_ID`
   - `TWITCH_CLIENT_SECRET`
   - `TWITCH_REDIRECT_URI`
   - `TWITCH_AUTH_SCOPES`
   - `TROVO_CLIENT_ID` (optional for now)
   - `PORT` (optional)
4. Start server:
   - `npm run dev` (dev)
   - `npm start` (single run)
5. Open:
   - `http://localhost:3000/` (Categories)
   - `http://localhost:3000/multiview` (Multiview)

## Twitch OAuth Setup

- Add an OAuth Redirect URL matching `TWITCH_REDIRECT_URI` exactly (local dev example: `http://localhost:3000/api/auth/twitch/callback`)
- Server-side Authorization Code flow only (tokens stored in HttpOnly server session)
- Auth routes:
  - `/api/auth/twitch/login`
  - `/api/auth/twitch/callback`
  - `/api/auth/me`
  - `/api/auth/twitch/logout`

## Architecture

### Frontend (`src/`)

- Modular vanilla JS
- Central `store` tracks:
  - multiview slots and focus state
  - category filters/sort
  - category channel list state
  - multiview context (`categoryId`, `categoryName`, `platform`)
- Main UI modules:
  - `src/ui/renderCategoriesView.js`
  - `src/ui/renderList.js`
  - `src/ui/renderSlots.js`
  - `src/ui/applyLayout.js`

### Backend (`server.js`, `server/lib/*`, `server/routes/*`)

- Express serves static UI and API proxy from the same port
- Twitch endpoints include:
  - `/api/twitch/categories?first=30`
  - `/api/twitch/streams-by-game?name=<category>&first=<n>`
- SPA routes are served for:
  - `/`
  - `/multiview`
  - `/categories`
  - `/categories/:id`

### Local Taxonomy (`src/data/category-taxonomy.json`)

- Curated category tags (`slug`, `label`, `group`)
- Top-30 snapshot order scaffold
- Category mappings by Twitch `game_id` and/or name fallback (`matchNames`)
- Placeholder entry for auto-onboarding new top categories (`needs_review`)

## Data Flow

### Categories (`/`)

1. Client loads top Twitch categories (`/api/twitch/categories?first=30`)
2. Client loads local taxonomy (`/src/data/category-taxonomy.json`)
3. Client enriches categories with curated tags
4. Sidebar filters categories by selected tags (AND logic)

### Category Channels (`/categories/:id`)

1. Selected category is resolved from client state by `categoryId`
2. Client loads live channels for the category via `/api/twitch/streams-by-game?name=<category>&first=40`
3. User clicks `Watch` to open multiview seeded with one channel

### Multiview (`/multiview`)

- If opened from category flow, URL contains context:
  - `categoryId`
  - `categoryName`
  - `platform`
  - `seed`
- Sidebar loads channels from the same category
- Seeded channel is placed into slot 1

## Current UX Contract (MVP)

- `/` -> browse categories and filter by curated tags
- `/categories/:id` -> choose a streamer from that category
- `/multiview` -> add more streamers and compare in 1-4 slots

`Watch` on category page:
- navigates to `/multiview?...&seed=<streamId>`
- seeds slot 1

`Add` in multiview:
- adds stream to current target slot (existing behavior)

## Troubleshooting

- Use `http://localhost:3000`, not Live Server (`127.0.0.1:5500`) for API-backed pages
- If categories load but tags do not:
  - check `src/data/category-taxonomy.json` mappings for current top categories
- If `/categories/:id` shows no channels:
  - inspect browser console for `[category-streams]` errors
  - verify category name resolves in Twitch API
- If UI shows fallback results:
  - confirm backend is running
  - verify `.env` credentials

## Documentation

- Product/UX spec for this flow: `docs/multiview-category-flow-spec.md`

## Next Steps

1. Add `Back to category` action in multiview
2. Add category context header in multiview sidebar
3. Add direct Twitch channel lookup endpoint (when login is not in current category list)
4. Add user playlists/presets for multiview (save reusable sets of streamers + layout)
5. Refactor to TypeScript + React after MVP flow is stable
