# Stream Hub

Stream Hub is a lightweight, self-hosted “multiview” hub for watching up to four live streams (Twitch + Trovo) side by side. It merges a directory/directory UI with a configurable grid and focusable player slots so you can quickly compare pro matches without juggling browser tabs.

## Highlights

- **Directory + multiview**: left pane lists live channels (merged Twitch + Trovo data) with sorting/filtering; right pane is a 2×2 grid of embeddable stream slots.
- **Slot targeting**: header buttons `1-4`, slot clicks, and keyboard digits stay in sync so you always know which player will receive the next stream.
- **Focus mode**: highlights the active slot (and hovered slot) with blur/saturation transitions while unmuting only the focused iframe; header and filters never blur.
- **Docking toggle**: switch the directory panel left/right without reloading the page.
- **Fallback data**: the app ships with sample streams so the UI stays populated if API requests fail or when offline.
- **Followed channels**: once you log in with Twitch, the sidebar surfaces your followed channels with quick `Add` links and a “Followed only” filter for the directory.
- **Categories view**: the new “Categories” tab pulls the top Twitch games + “Just Chatting”, shows Twitch’s genre tags, and lets you intersect those tags to filter the main list.

## Getting Started

1. `npm install` to pull Express + dotenv dependencies.
2. Copy `.env.example` to `.env` and supply `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_REDIRECT_URI`, `TWITCH_AUTH_SCOPES`, `TROVO_CLIENT_ID`, and (optionally) `PORT`. The API proxy uses these credentials to request `helix`/Trovo data and to complete Twitch OAuth callbacks.
3. Run `npm run dev` for automatic reloads during development or `npm start` for a one-off run.
4. Point your browser to `http://localhost:3000` (the server serves the static UI and API proxy from the same port).

## Twitch OAuth Setup

- In the Twitch Developer Console, create (or update) your app and add an OAuth Redirect URL that matches `TWITCH_REDIRECT_URI` exactly (for local dev: `http://localhost:3000/api/auth/twitch/callback`).
- Use the server-side Authorization Code flow only. This project stores Twitch access tokens in an HttpOnly server session (in-memory) and does not expose them to the browser.
- Current auth routes: `/api/auth/twitch/login`, `/api/auth/twitch/callback`, `/api/auth/me`, `/api/auth/twitch/logout`.
- Default scope is `user:read:follows`, which is enough for future "import followed channels" functionality.

## Architecture

- **Frontend** (`src/`): modular vanilla JS that uses `state`/`store` to track slots, filters, focus mode, etc. The UI is built from reusable modules (`ui/renderList.js`, `ui/renderSlots.js`, `ui/applyLayout.js`, etc.), and the `api` folder contains Twitch + Trovo hydrate helpers that normalize API responses.
- **Backend** (`server.js` + `server/lib/*`): Express serves static assets and exposes `/api/twitch/*` plus `/api/trovo/*` proxies. Each proxy handles authentication, pagination, and normalization before forwarding data to the client.
- **Styling**: `styles.css` defines the dark mode theme, CSS variables, focus-mode transitions, overlay buttons, and responsive layout.

## APIs & Data Flow

- Directory calls `/api/twitch/streams-by-game?name=Dota%202&first=10` and `/api/trovo/streams-by-game?name=Dota%202&first=10` (configurable via `hydrate` helpers). Responses are normalized to `{ id, platform, channel, title, category, language, viewerCount, createdAt, url, profileImageUrl, isLive }`.
- A new `/api/twitch/categories` endpoint returns the top 10 games + “Just Chatting” along with Twitch’s tag metadata, so the “Categories” tab can render clickable tags and the main directory can filter streams that match **all** active tags.
- Click `Add` to map a stream ID into `state.slots`. When focus mode is active, the corresponding iframe is unmuted, and CSS classes update to keep the overlay synchronized.
- Slot overlays include “Open” links, “Clear” actions, and badge states for missing/offline streams.

## Development Notes

- `state` is persisted to `localStorage` (dock position, focus mode, selected slots). The UI hydrates from saved state on load.
- The directory can also filter to “followed only” streams, and the sidebar now reflects your Twitch follows via `/api/auth/twitch/follows`.
- Focus mode uses `slotEls` hover/active tracking to blur non-target slots while keeping Twitch/Trovo iframes muted unless selected. Sound permissions are ultimately limited by embed autoplay policies.
- Embedded streams rely on Twitch/Trovo parent/whitelist configuration—if embedding is blocked, the overlay still exposes direct channel links.

## Troubleshooting

- Use `npm run dev` if you are actively editing files, because plain `node server.js` won’t reload automatically.
- If the Twitch/Trovo endpoints return “fallback (API error)” in the UI, confirm the backend is running on `http://localhost:3000` (not a Live Server port) and that the credentials in `.env` are correct.

## Legal / Data

- Trovo’s API requires publishing a privacy policy/privacy notice, and the app should respect Trovo’s branding + data-sharing obligations outlined in their legal documents. Keep user data (e.g., favorites) on this server only unless a separate agreement permits sharing with Trovo/Twitch.

## Next Steps

1. Persist Twitch-authenticated user data (favorites/playlists) in a database instead of in-memory/local state.
2. Expand directory filters (MMR, region, languages) once APIs expose those metrics.
3. Improve embed fallbacks (custom posters, refreshed states) if the platform restricts autoplay.
4. Add a button to mute all channels, and mute all except active.
