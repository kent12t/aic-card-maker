---
name: aic-campaign-platform
description: Guides the AIC card campaign implementation with Vercel and Convex.
---

# AIC Campaign Platform

Read `docs/CONVEX_PLAN.md` before changing campaign infrastructure.

## Architecture

- Vercel hosts all interfaces.
- Convex is the only backend and source of truth.
- Submissions go through the `/cards` HTTP action in `convex/http.ts`, which validates bytes before storing.
- Display walls read `api.cards.listPublished` reactively.
- Moderation is done in the Convex dashboard by setting `cards.status` to `removed`.

## Implementation rules

- Inspect current code and human changes before editing.
- Keep changes focused and preserve existing UI behavior.
- Keep submission idempotent via the `Idempotency-Key` header and `by_idempotency_key` index.
- Validate file type, size, signature, dimensions, and location server-side (`convex/lib/image.ts`).
- Query only published cards on public walls, bounded with `take`.
- Keep internal-only functions as `internalQuery` / `internalMutation`.

After changes, run lint, TypeScript checks, and a production build where possible.
