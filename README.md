# AIC Card Maker

A Next.js card customizer for Community Care Day. Users can pick a frame, drag stickers/person assets, add editable text, upload their own image, and export the result as a PNG.

## Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS
- `html-to-image` for PNG export
- `lucide-react` icons
- Convex is planned for campaign data, image storage, realtime displays, and moderation

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Run local dev server:

```bash
npm run dev
```

3. Open `http://localhost:3000`.

## Available scripts

- `npm run dev` - start development server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run ESLint

## Project structure

- `app/page.tsx` - main stateful card-maker page that composes all UI components
- `app/layout.tsx` - global layout, fonts, and metadata (includes favicon config)
- `components/card-maker/` - page UI components (canvas, editor panels, modal, buttons)
- `lib/card-maker/` - shared domain types, constants, and utility functions
- `public/assets/` - frame/sticker/message/person image assets
- `public/logo.svg` - SVG logo
- `public/favicon.svg` - SVG favicon used in `<head>`

## Notes

- The submit action currently logs payload data and shows an alert placeholder.
- Uploaded images are added to the canvas using object URLs in-browser.
- The page keeps desktop and mobile editor layouts with matching functionality.
- Campaign implementation is outlined in `docs/CONVEX_PLAN.md`.
