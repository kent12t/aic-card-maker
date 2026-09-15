# AIC Campaign — Convex Plan

## Architecture

- Vercel hosts the card maker, display walls, and moderation interface.
- Convex provides functions, database records, file storage, realtime queries, and scheduled work.
- Convex is the only backend and source of truth.
- Valid cards appear immediately after validation.
- Removing a card makes every connected or reconnecting wall stop displaying it. Revoking old image URLs or caches is not required.

## Submission flow

1. The browser renders an 800 × 800 WebP card, with PNG fallback.
2. A Convex mutation creates an `uploading` submission and returns an upload URL.
3. The browser uploads the image directly to Convex Storage.
4. The browser finalizes the submission using its submission ID and idempotency key.
5. A Convex action validates file type, size, signature, and dimensions.
6. A mutation changes the valid submission to `published`.
7. Display walls update through a reactive query.

Rejected files and stale `uploading` submissions are deleted by scheduled cleanup.

## Data

### `locations`

- slug, name, active

### `submissions`

- location ID
- Convex storage ID
- MIME type, byte size, width, height
- status: `uploading`, `validating`, `published`, or `removed`
- idempotency key
- submitted, reviewed, and moderated timestamps

### `moderationEvents`

- submission ID
- moderator ID
- action, reason, timestamp

## Display wall

- Query only `published` submissions.
- Order by submission time and ID.
- Feature each new card for two seconds, then move it into the grid.
- Reactive query changes add new cards and remove moderated cards.
- Refetching after reconnect restores the authoritative state.

## Moderation

- Require authenticated, allowlisted moderators.
- Show an newest-first queue with location and status filters.
- Keep and remove actions must be idempotent and audited.
- ZIP exports run as bounded background jobs and produce short-lived download links.

## Implementation order

1. Add Convex and define the schema.
2. Replace the placeholder submit action with direct upload and finalization.
3. Build the reactive display wall.
4. Add moderator authentication and review actions.
5. Add rate limits, cleanup, exports, monitoring, and launch tests.

## Launch checks

- Duplicate submission retries create one card.
- Invalid images and locations are rejected.
- Removed cards disappear from all walls promptly.
- Reconnects do not lose or duplicate cards.
- Moderator actions are authenticated and audited.
- Burst tests pass for the expected campaign traffic.
