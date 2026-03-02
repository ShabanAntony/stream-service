# Stream Hub

Stream Hub is a lightweight, self-hosted multiview hub for watching up to four live streams (currently Twitch-first) side by side.

Current UX flow is split into clear stages:
- `/` -> categories browser
- `/categories/:id` -> channels inside a category
- `/multiview` -> player grid and stream comparison

## Highlights

- **Separated browsing flow**: categories, category channels, and multiview are separate pages with distinct responsibilities.
- **Multiview (up to 4 slots)**: 2x2 player grid with slot targeting, focus mode, and dock controls.
- **Hybrid multiview rendering**: multiview player slots + multiview sidebar list are rendered by React + TypeScript, while routing/categories/auth remain legacy vanilla JS.
- **Adaptive multiview layout**: active slot is promoted to large tile in 3-slot view; 1/2/4-slot layouts fill available workspace.
- **Slot targeting sync**: header buttons `1-4`, allowed keyboard digits, and clicked slots stay synchronized.
- **Scoped hotkeys**: digits are limited by visible slots (`1`: disabled, `2`: only `1-2`, `3`: only `1-3`, `4`: `1-4`).
- **Clear as delete**: clearing a slot compacts remaining streams left-to-right, without empty leading gaps.
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
   - `PORT` (optional)
4. Build React multiview assets:
   - `npm run build:client`
5. Start server:
   - `npm run dev` (dev)
   - `npm start` (single run)
6. Open:
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

### Frontend (`src/`, `src-react/`)

- Hybrid frontend:
  - `src/` legacy vanilla JS (routing, directory, categories, auth)
  - `src-react/` React + TypeScript multiview slot island
- Central `store` tracks:
  - multiview slots and focus state
  - category filters/sort
  - category channel list state
  - multiview context (`categoryId`, `categoryName`)
- Main UI modules:
  - `src/ui/renderCategoriesView.js`
  - `src/ui/renderList.js`
  - `src/ui/applyLayout.js`
- React multiview island:
  - `src-react/multiview-entry.tsx`
  - `src-react/features/multiview/*`

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
  - `seed`
- Sidebar loads channels from the same category
- Seeded channel is placed into slot 1
- Sidebar meta/list and player slots are synchronized through `window.multiviewBridge`
- Sidebar list supports infinite scroll with Twitch cursor pagination
- Platform filter in multiview is temporarily disabled (Twitch-only integration path)

## Current UX Contract (MVP)

- `/` -> browse categories and filter by curated tags
- `/categories/:id` -> choose a streamer from that category
- `/multiview` -> add more streamers and compare in 1-4 slots

`Watch` on category page:
- navigates to `/multiview?...&seed=<streamId>`
- seeds slot 1

`Add` in multiview:
- adds stream to next free slot, synchronized with React slot island

`Clear` in multiview:
- deletes slot content and compacts remaining streams left-to-right

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
- If multiview page looks outdated after changes:
  - run `npm run build:client` again (React slot island is served from `dist/assets/*`)

## Documentation

- Product/UX spec for this flow: `docs/multiview-category-flow-spec.md`

## Next Steps
1. Move multiview header controls from DOM-bridge listeners to pure React components (remove direct `querySelector` bindings in `src-react/multiview-entry.tsx`)
2. Add direct Twitch channel lookup endpoint (when login is not in current category list)
3. Add user presets/playlists for multiview (saved streamer sets + layout)
4. Expand React migration beyond multiview (routing/categories)
