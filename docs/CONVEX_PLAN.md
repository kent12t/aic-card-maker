# AIC Campaign — Convex Plan

## Architecture

- Vercel hosts the card maker (`/`) and display walls (`/display`).
- Convex is the only backend and source of truth: HTTP action, database, file storage, reactive queries.
- Moderation uses the Convex dashboard directly — no custom moderation UI, auth, or audit tables.
- Valid cards appear immediately. Removing a card makes every connected or reconnecting wall stop displaying it.

## Submission flow

1. The browser renders the card at 800 × 800 as WebP (the canvas falls back to PNG where WebP encoding is unsupported).
2. The browser `POST`s the image bytes to the Convex HTTP action `/cards` with an `Idempotency-Key` header and an optional `?location=<slug>`.
3. The HTTP action:
   - rejects bad keys, oversize bodies, and unknown/inactive locations;
   - returns the existing card if the key was already used (retries create one card);
   - validates size (≤ 2 MB), file signature (PNG/WebP), and dimensions (800 × 800) from the bytes, never trusting `Content-Type`;
   - stores the file and inserts a `published` card in one mutation, deleting its own file if a concurrent retry won.
4. Display walls update through a reactive query.

Because validation happens before `ctx.storage.store`, nothing unvalidated ever lands in storage, so no cleanup jobs are needed.

## Data

### `locations`

- slug, name, active — created in the dashboard. Leave empty if the campaign has no locations.

### `cards`

- storage ID, optional location ID
- idempotency key, MIME type, byte size
- status: `published` or `removed`

## Display wall

- `/display` shows all published cards; `/display?location=<slug>` shows one location.
- Queries only `published` cards, newest first, capped at 200.
- Each new card is featured for two seconds, then moves into the grid.
- Convex's websocket subscription resyncs automatically after reconnects.

## Moderation (Convex dashboard)

- Data → `cards` → edit a row's `status` to `removed`. Walls drop it instantly; set it back to `published` to restore.
- Deleting the row also works, but orphans its file in Files; prefer `removed`.
- Dashboard access is controlled by Convex team membership.

## Setup

1. `npx convex dev` — logs in, creates the dev deployment, writes `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` to `.env.local`.
2. Optional: set `CLIENT_ORIGIN` (e.g. `https://your-app.vercel.app`) in the Convex dashboard env vars to restrict CORS.
3. Production: set the Vercel build command to `npx convex deploy --cmd 'npm run build'` with `CONVEX_DEPLOY_KEY` (production only).

## Launch checks

- Duplicate submission retries create one card.
- Invalid images and locations are rejected.
- Removed cards disappear from all walls promptly.
- Reconnects do not lose or duplicate cards.
- `@convex-dev/rate-limiter` guards `POST /cards`: 6/min per IP and 120/min globally (tune in `convex/lib/rateLimits.ts`). Over-limit requests get `429` with `Retry-After`.
