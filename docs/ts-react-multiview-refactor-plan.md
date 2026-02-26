# TS + React Multiview Refactor Plan

## Goal

Move the multiview UI to React + TypeScript incrementally, while eliminating full slot rerenders and preserving iframe mounts during local UI interactions.

## Rules (do not break)

- Do not remount iframe on `focus`, `activeSlot`, `targetSlot`, hover changes.
- Do not rerender all slots for one-slot updates.
- Keep current app (`index.html` + `src/main.js`) working until the React slice is proven.
- Validate each stage before moving to the next.

## Stages

### Stage 1: Migration scaffold

Status: done

Scope:
- Add `Vite + React + TypeScript` scaffold in parallel to current app
- Keep current server and frontend unchanged
- Add build and typecheck scripts

Verification:
- `npm run typecheck`
- `npm run build:client`
- Current app still starts with `npm run dev`

### Stage 2: React multiview sandbox (isolated)

Status: done

Scope:
- Add local multiview store (`zustand`)
- Add slot grid and directory sandbox
- Use slot-local subscriptions
- Keep iframe `src` independent from UI-only state (focus/target)

Verification:
- `npm run typecheck`
- `npm run build:client`
- Open `/index.react.html` via Vite and confirm:
  - selecting target slot updates slot badges
  - adding a stream updates the targeted slot
  - focus toggle updates UI state without replacing every slot

### Stage 3: Bridge real app data to React multiview

Status: in progress

Scope:
- Reuse current stream data shape from existing frontend
- Replace `renderSlots()` path with React island mount
- Keep legacy directory rendering for now

Completed in this pass:
- React sandbox now hydrates from current `/api/twitch` and `/api/trovo` endpoints
- React sandbox reuses current fallback data/config (`src/data/fallbackStreams.js`, `src/config.js`)
- URL `?seed=` bootstrapping is supported in the React sandbox

Verification:
- Add/remove stream in multiview updates only affected slot
- Filters/search rerender sidebar/list but do not remount active players
- Existing auth/category routes still work

### Stage 4: Route migration and cleanup

Status: pending

Scope:
- Migrate multiview page controls from `events.js` to React
- Remove duplicate slot logic from legacy renderer
- Add test coverage (render scope + interaction flows)

Verification:
- No `innerHTML` writes for player slots
- No legacy slot rendering calls on multiview interactions
- Manual smoke test on `/multiview`, `/categories`, `/categories/:id`

## Current Files Added (Migration Slice)

- `index.react.html`
- `src-react/*`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`

## Notes

- The React sandbox is intentionally isolated first. This de-risks performance behavior before wiring it into the legacy event system.
- Audio mute/unmute orchestration is deferred until player lifecycle is stable.
