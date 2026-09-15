---
name: aic-campaign-platform
description: Guides the AIC card campaign implementation with Vercel and Convex.
---

# AIC Campaign Platform

Read `docs/CONVEX_PLAN.md` before changing campaign infrastructure.

## Architecture

- Vercel hosts all interfaces.
- Convex is the only backend and source of truth.
- Use Convex functions, database, file storage, reactive queries, and scheduled work.
- Publish valid cards immediately after validation.
- Removed cards must promptly stop rendering on all walls.

## Implementation rules

- Inspect current code and human changes before editing.
- Keep changes focused and preserve existing UI behavior.
- Upload images directly to Convex Storage.
- Make submission and moderation mutations idempotent.
- Validate file type, size, signature, dimensions, and location.
- Clean up rejected and stale uploads.
- Query only published cards on public walls.
- Require authenticated moderators and append-only audit events.
- Use bounded background jobs for ZIP exports.

After changes, run lint, TypeScript checks, focused tests, and a production build where possible.
