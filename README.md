# Stream Hub

Stream Hub is a lightweight, self-hosted “multiview” hub for watching up to four live streams (Twitch + Trovo) side by side. It merges a directory/directory UI with a configurable grid and focusable player slots so you can quickly compare pro matches without juggling browser tabs.

## Highlights
- **Directory + multiview**: left pane lists live channels (merged Twitch + Trovo data) with sorting/filtering; right pane is a 2×2 grid of embeddable stream slots.
- **Slot targeting**: header buttons `1-4`, slot clicks, and keyboard digits stay in sync so you always know which player will receive the next stream.
- **Focus mode**: highlights the active slot (and hovered slot) with blur/saturation transitions while unmuting only the focused iframe; header and filters never blur.
- **Docking toggle**: switch the directory panel left/right without reloading the page.
- **Fallback data**: the app ships with sample streams so the UI stays populated if API requests fail or when offline.

## Getting Started
1. `npm install` to pull Express + dotenv dependencies.
2. Copy `.env.example` to `.env` and supply `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TROVO_CLIENT_ID`, and (optionally) `PORT`. The API proxy uses these credentials to request `helix`/Trovo data via server-to-server requests.
3. Run `npm run dev` for automatic reloads during development or `npm start` for a one-off run.
4. Point your browser to `http://localhost:3000` (the server serves the static UI and API proxy from the same port).

## Architecture
- **Frontend** (`src/`): modular vanilla JS that uses `state`/`store` to track slots, filters, focus mode, etc. The UI is built from reusable modules (`ui/renderList.js`, `ui/renderSlots.js`, `ui/applyLayout.js`, etc.), and the `api` folder contains Twitch + Trovo hydrate helpers that normalize API responses.
- **Backend** (`server.js` + `server/lib/*`): Express serves static assets and exposes `/api/twitch/*` plus `/api/trovo/*` proxies. Each proxy handles authentication, pagination, and normalization before forwarding data to the client.
- **Styling**: `styles.css` defines the dark mode theme, CSS variables, focus-mode transitions, overlay buttons, and responsive layout.

## APIs & Data Flow
- Directory calls `/api/twitch/streams-by-game?name=Dota%202&first=10` and `/api/trovo/streams-by-game?name=Dota%202&first=10` (configurable via `hydrate` helpers). Responses are normalized to `{ id, platform, channel, title, category, language, viewerCount, createdAt, url, profileImageUrl, isLive }`.
- Click `Add` to map a stream ID into `state.slots`. When focus mode is active, the corresponding iframe is unmuted, and CSS classes update to keep the overlay synchronized.
- Slot overlays include “Open” links, “Clear” actions, and badge states for missing/offline streams.

## Development Notes
- `state` is persisted to `localStorage` (dock position, focus mode, selected slots). The UI hydrates from saved state on load.
- Focus mode uses `slotEls` hover/active tracking to blur non-target slots while keeping Twitch/Trovo iframes muted unless selected. Sound permissions are ultimately limited by embed autoplay policies.
- Embedded streams rely on Twitch/Trovo parent/whitelist configuration—if embedding is blocked, the overlay still exposes direct channel links.

## Troubleshooting
- Use `npm run dev` if you are actively editing files, because plain `node server.js` won’t reload automatically.
- If the Twitch/Trovo endpoints return “fallback (API error)” in the UI, confirm the backend is running on `http://localhost:3000` (not a Live Server port) and that the credentials in `.env` are correct.

## Legal / Data
- Trovo’s API requires publishing a privacy policy/privacy notice, and the app should respect Trovo’s branding + data-sharing obligations outlined in their legal documents. Keep user data (e.g., favorites) on this server only unless a separate agreement permits sharing with Trovo/Twitch.

## Next Steps
1. Add user auth (OAuth) to save favorites/playlists across devices.
2. Expand directory filters (MMR, region, languages) once APIs expose those metrics.
3. Improve embed fallbacks (custom posters, refreshed states) if the platform restricts autoplay.
