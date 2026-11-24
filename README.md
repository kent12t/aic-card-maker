# CCD Thank You

The card maker and live Thank You Wall for **Community Care Day**. Visitors pick a frame, a community care professional, a message, and stickers, then submit the card and watch it join a wall of thank-you cards. It ran at the Community Care Day campaign site and as a booth at the National Celebration of Seniors 2026, where 347 cards were submitted.

Live: [ccdthankyou.com](https://ccdthankyou.com/) · Case study: [kentlimanza.co/work/ccd-thank-you](https://kentlimanza.co/work/ccd-thank-you)

## What it does

- **Card maker** (`/design`): a drag-and-drop editor with matching desktop and mobile layouts. It exports an 800 × 663 WebP image (PNG where WebP encoding isn't supported).
- **Live wall** (`/display`): published cards stream in through a Convex reactive query. The wall loads small thumbnails first, limits concurrent downloads, reuses decoded images, and respects reduced-motion settings. Enlarged cards load the original. See [docs/display-wall-performance.md](docs/display-wall-performance.md).
- **Event mode** (`?event=true`): one codebase serves both the booth tablet and visitors at home. Event mode adds a QR download in place of Share, reloads the shared tablet after 60 seconds idle, hides buttons on the LED wall, and stays on through internal links.
- **Analytics** (`/analytics`): a read-only dashboard of card counts by Singapore-time date, built from card metadata only.
- **Safeguards**: submissions are rate limited, validated on the server from the file's bytes, and de-duplicated with an idempotency key. The editor blocks cards with only a frame on them.
- **Moderation**: set a card's `status` to `removed` in the Convex dashboard (Data, then `cards`) and every connected wall drops it.

## Stack

Next.js (App Router), React, TypeScript, Tailwind CSS, Convex (submissions, image storage, realtime queries), `sharp` for wall thumbnails, `html-to-image`/Canvas for export, Vercel Analytics, Playwright.

## Running it locally

```bash
npm install
npx convex dev   # first run logs in and writes .env.local; keep it running
npm run dev      # in a second terminal
```

Open `http://localhost:3000` for the landing page, `/design` for the card maker, and `/display` for the wall.

Environment variables: `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CONVEX_SITE_URL` (written by `npx convex dev`), and `CLIENT_ORIGIN` on the Convex deployment, a comma-separated list of origins allowed to submit cards.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run test:render` | Playwright checks (Chromium and WebKit): card rendering, blank-card prevention, event navigation, layouts, analytics, and wall loading |

## Project structure

- `app/` routes: landing, `design/`, `display/`, `analytics/`, and `api/` for wall thumbnails and originals
- `components/` UI for the card maker, the wall, and the landing page
- `lib/card-maker/` card types, constants, rendering, and submission
- `convex/` schema, the `/cards` HTTP action, image validation, and the published-cards query
- `public/assets/` frames, stickers, messages, and avatars
- `docs/` [Convex plan](docs/CONVEX_PLAN.md), [wall performance](docs/display-wall-performance.md), and [style guide](docs/style-guide.md)

## Credits

Original concept by others. Final UI design by Ting Hui, and stickers by Nadiah and Megan. Client servicing and event by Raja and Tammy.

I (Kent, [@kent12t](https://github.com/kent12t)) was the system and UX architect: wireframes, architecture and security diagrams, user journeys, event mode, and the implementation. Much of the code was written with AI assistance, directed and reviewed by me.

Frames, characters, messages, and stickers in `public/assets/` are artwork made for Community Care Day, shown here for reference.
