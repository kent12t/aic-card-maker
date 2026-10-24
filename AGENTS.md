## Cloud Agent

The dev backend is an anonymous local Convex process. Do not run `npx convex login` or `npx convex deploy`.

- Open the app at `http://localhost:3000`. Next.js dev blocks `127.0.0.1`, so that host stays on the server-rendered shell and `/display` never leaves "Loading cards…".
- On boot, Convex and `npm run dev` are already running. Convex serves queries at `http://127.0.0.1:3210` and card uploads (`POST /cards`) at `http://127.0.0.1:3211`.
- If they are down, from `/workspace` run `CONVEX_AGENT_MODE=anonymous npx convex dev --typecheck disable --tail-logs disable --start "npm run dev -- --hostname 0.0.0.0 --port 3000"`.
- `.env.local` and `.convex/` are local state. Leave them untracked.

## Frontend design

Before changing UI styling, read [`docs/style-guide.md`](docs/style-guide.md).
It records the approved landing-page palette, local fonts, raised button states,
corner radii, responsive behavior, assets, and user-requested refinements. Use it
as the visual reference for subsequent design-page updates. Keep the guide in
sync when design decisions change.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
