# Community Care Day UI style guide

This is the persistent design reference for future agents working on the UI.
It records the implemented landing page and the user's refinements, including
the smaller mobile card stack, wider mobile copy, larger mobile step icons, and
buttons that start raised. Use this visual language when updating the designer.

## Source of truth

| File | Responsibility |
| --- | --- |
| `app/globals.css` | Global color variables; existing app defaults |
| `app/page.tsx` | Landing markup and links |
| `lib/fonts.ts` | Shared local Circular and Caslon font loading |
| `app/page.module.css` | Landing layout, typography, buttons, motion, breakpoints |
| `components/landing/LandingNav.tsx` | Desktop links and mobile dropdown |
| `components/landing/SiteHeader.tsx` | Shared logo group and navigation; compact desktop designer variant |
| `components/landing/CardDeck.tsx` | Animated cards and pause control |
| `components/Modal.tsx` | Shared native dialog behavior, focus containment, and dismissal |
| `components/card-maker/StatusNotice.tsx` | Clear, download/QR, submission, loading, and error modals |
| `app/design/page.tsx` | Responsive card designer and editor interactions |
| `app/design/page.module.css` | Designer layout, tabs, palette, buttons, instructions, and help modal |
| `app/display/page.module.css` | Display header, compact logos, violet highlight, and create-CTA placement |

Landing and designer import the local fonts from `lib/fonts.ts` and apply
their variable classes to the route root; the display layout also applies the
Circular variable. The global body retains Open Sans for other existing screens.
Merely referencing `--font-circular` or `--font-caslon`
outside a root with those variable classes is insufficient.

## 1. Color palette

Reuse the CSS variables in `app/globals.css` for new branded UI.

| Name | CSS variable | Hex | Current role |
| --- | --- | --- | --- |
| Dark orange | `--color-dark-orange` | `#ef5023` | First line of hero heading |
| Orange | `--color-orange` | `#f99d21` | Remaining heading lines; primary CTA fill |
| Light yellow | `--color-light-yellow` | `#ffe299` | Secondary CTA fill |
| Dark purple | `--color-dark-purple` | `#241f61` | Body text, button text, outlines, hard shadows |
| Purple | `--color-purple` | `#682c85` | Step captions; keyboard focus outlines |
| Light violet | `--color-light-violet` | `#8f8fc6` | Available brand color; unused on landing |
| Violet | `--color-violet` | `#7978b5` | Desktop nav, mobile menu divider/icon, animation control |
| White | `--bg` | `#ffffff` | Landing background |

The mobile hamburger icon backing and dropdown use `#d6d4ee`, a supplemental
pale purple surface. This is currently a literal in the landing CSS, not the
brand light-violet variable.

The landing has a flat white background. Its root overrides the existing global
body gradient. Other existing variables (`--care-orange: #ff661e`,
`--brand-purple: #6b3b9c`, etc.) belong to the older UI and are not aliases for
the palette above.

## 2. Fonts and typography

Fonts are local assets in `public/assets/fonts/`, loaded with `next/font/local`.
Use the provided font files and explicit weights rather than synthesized bold.

| Role | Family / weight | File |
| --- | --- | --- |
| H1 and CTA labels | Circular Std Black, `900` | `CircularStd-Black.ttf` |
| Navigation | Circular Std Medium, `500` | `CircularStd-Medium.ttf` |
| Body copy | Caslon Doric Regular No2, `400` | `CaslonDoric-RegularNo2.otf` |
| Step captions | Caslon Doric Regular No2 Italic, `400` | `CaslonDoric-RegularNo2Italic.otf` |
| How-it-works step numbers | Caslon Doric Semibold, `600`, upright | `CaslonDoric-Semibold.otf` |

```css
/* These next/font variables must exist on an ancestor. */
.heading, .button, .nav {
  font-family: var(--font-circular), sans-serif;
}

.bodyCopy {
  font-family: var(--font-caslon), sans-serif;
}
```

### Type scale

| Element | Desktop base | Tablet, <=1100px | Mobile, <=600px |
| --- | --- | --- | --- |
| H1 size | `clamp(50px, 5.2vw, 100px)` | `clamp(64px, 8.5vw, 88px)` | `clamp(34px, 11.3vw, 64px)` |
| H1 line height | `0.89` | Inherits base | `0.91` |
| Body size | `clamp(21px, 1.875vw, 36px)` | `28px` | `clamp(16px, 4.32vw, 21px)` |
| Body line height | `1.14` | Inherits base | `1.15` |
| Nav size | `clamp(18px, 1.56vw, 30px)` | Inherits base | `24px` dropdown links |
| Step captions | `clamp(18px, 1.25vw, 24px)` | Inherits base | `13px` |
| Button labels | `clamp(14px, 4.2cqw, 30px)` | Inherits base | `clamp(14px, 4cqw, 20px)` |

H1 tracking is `-0.035em`. Body tracking is `-0.025em`, changing to
`-0.015em` on mobile. Buttons have `line-height: 1.15` and no label wrapping.

The hero heading has three explicit lines: “Say thank you” / “to the people” /
“who care.” The first line is dark orange and the others are orange.

## 3. Buttons

### Visual treatment

Use rounded, outlined, neobrutalist-style buttons with a solid offset shadow.
The default state is already **raised**. Hover lowers the button slightly;
pressing makes it flat. Preserve this direction when reusing the style.

| Property | Desktop base | <=1400px | Mobile, <=600px |
| --- | --- | --- | --- |
| Min height | `76px` | `60px` | `44px` |
| Vertical padding | `16px` | `14px` | `10px` |
| Horizontal padding | `clamp(8px, 3cqw, 24px)` | Inherits base | `8px` |
| Border | `3px solid var(--color-dark-purple)` | Inherits base | `1.5px solid var(--color-dark-purple)` |
| Corner radius | `22px` | `17px` | `8px` |
| Text | Circular Std Black `900`, dark purple | Same | Same |
| Primary fill | Orange | Same | Same |
| Secondary fill | Light yellow | Same | Same |

### States

| State | Transform | Shadow |
| --- | --- | --- |
| Desktop resting | `translate(-4px, -4px)` | `5px 5px 0` dark purple |
| Hover, capable mouse devices only | `translate(-2px, -2px)` | `3px 3px 0` dark purple |
| Pressed | `translate(0, 0)` | Zero offset / no visible shadow |
| Mobile resting | `translate(-2px, -2px)` | `3px 3px 0` dark purple |

Transitions: `transform 180ms ease, box-shadow 180ms ease`.
Wrap hover rules in `@media (hover: hover) and (pointer: fine)` so touch devices
do not depend on hover. Keep the `:active` rule after the hover rule so pressing
wins. Disable transitions under `prefers-reduced-motion: reduce`.

Keyboard focus on landing links and controls uses a `3px` purple outline with
`6px` outline offset. Do not replace it with a shadow-only focus indicator.

### Responsive button row

- Use flexbox with `flex-wrap: wrap`; keep both CTAs horizontal while readable.
- Scale labels against the content container, with a **14px minimum**.
- `.content` declares `container-type: inline-size`; this is required for `cqw`.
  Copying the button rules without an appropriate container changes their sizing.
- Base row gap: `clamp(10px, 3cqw, 22px)`; mobile gap: `10px`.
- Mobile buttons have `flex-grow: 1` and fill remaining horizontal space.
- Mobile row margin is
  `32px clamp(0px, calc((100cqw - 316px) / 2), 10px) 0`.
- With the current labels, the buttons fit side by side at 360px and 394px;
  at 320px they naturally wrap. Do not force two columns by shrinking text
  below 14px or clipping labels.

## 4. Corner radii and outlines

| Element | Radius / outline |
| --- | --- |
| CTA, large desktop | `22px`, `3px` dark-purple border |
| CTA, <=1400px | `17px`, `3px` dark-purple border |
| CTA, mobile | `8px`, `1.5px` dark-purple border |
| Mobile menu toggle hit area | `7px`, no border, transparent background |
| Hamburger glyph backing | `5px` |
| Mobile dropdown | `7px` |
| Animation pause/play control | `50%`, `1px` violet border |

The card artwork includes its own decorative borders, shadows, and corners.
Display the complete image rather than clipping it to another rounded rectangle.

## 5. Layout and spacing

### Desktop (>1100px)

- Header and hero each have a maximum width of `1920px`, centered.
- Header: logos on the left; navigation on the right.
- Hero: copy on the left, cards on the right; columns `0.88fr 1.12fr`.
- Base hero gap: `clamp(48px, 6.8vw, 130px)`.
- Base hero padding: `clamp(48px, 3.2vw, 62px) 5.5% 96px 7.8%`.
- At <=1400px: hero gap `54px`, left/right padding `6%` / `5%`.
- Copy maximum width `650px`; step row maximum width `505px`.
- Vertical rhythm: heading to copy `32px`; copy to steps `46px`;
  steps to CTAs `48px` (`34px` at <=1400px).

### Tablet (601–1100px)

- One-column hero, cards first, centered copy below.
- Hero padding `64px 8% 80px`, gap `50px`.
- Content maximum width `690px`; cards maximum width `700px`.
- Header retains inline desktop navigation.

### Mobile (<=600px)

- Header keeps both logos and the hamburger on one row.
- Header padding `16px 5% 0 8%`; hero padding `24px 6% 40px`.
- Cards appear above the heading; hero gap `28px`.
- **Card section width is 80% of the hero's content area**, centered: the user
  requested a 20% smaller mobile deck after the initial implementation.
- Center the heading, body copy, steps, and CTA row.
- Body copy maximum width **360px**; allow it to fill narrower available space.
- Step row maximum width **310px**; step icons are **52 × 52px**.
- Step-caption gap `0`; arrows sit in a `15px`-high flexible container with
  `20px 5px 0` margin.
- Vertical rhythm: heading to copy `22px`; copy to steps `30px`;
  steps to CTAs `32px`.

These mobile values include the user's latest adjustments. The original mockup
is a compositional reference; retain the subsequent smaller deck and wider copy.

## 6. Navigation

- Logo group links to `/`.
- “Thank You Wall” links to `/display`.
- “CCD Day” links to `https://for.sg/ccd26` in a new tab, with
  `rel="noopener noreferrer"`.
- Main CTA links to `/design`; `/?event=true` carries event mode through to
  `/design?event=true`.
- The display-wall create CTA also links directly to `/design`.

Desktop links use violet, a thin vertical separator, and underline on hover.
On mobile use a `44 × 44px` hamburger button hit area and a pale-purple dropdown
of `min(270px, 80vw)` width, with a horizontal violet divider. The menu opens
over the card area without shifting page content. Keep `aria-expanded`,
`aria-controls`, outside-click dismissal, focus-leave dismissal, and Escape
handling; Escape returns focus to the toggle.

## 7. Artwork and motion

Assets live in `public/assets/misc/` (URL prefix `/assets/misc/`):

- Logos: `aic_logo.svg`, `ccd-logo.svg`.
- Steps: `icon_design.svg`, `icon_submit.svg`, `icon_share.svg`.
- Connecting arrow: `icon_arrow.svg`.
- Cards: `card_kv1.webp`, `card_kv2.webp`, `card_kv3.webp`.

Preserve image proportions with `object-fit: contain`. Logos use a responsive
CSS width and `height: auto`. Arrows use Next.js `Image` with `fill` inside a
positioned wrapper to avoid width/height modification warnings. Do not re-add
fixed arrow image dimensions that conflict with its flexible width.

The deck has `aspect-ratio: 1.11`, overlapping full-area cards and a 12-second
loop, giving each of the three cards a four-second turn at the front. Its easing
is `cubic-bezier(0.45, 0, 0.2, 1)`. The outgoing card moves outward, then behind
the other two; use the existing `shuffle` keyframes as the motion reference.

- **No extra blue rectangle behind the stack**; the user requested its removal.
- Keep the pause/play control and meaningful image alt text.
- Under reduced motion, show a static layered deck, hide the animation control,
  and remove `will-change`.

### Landing ↔ designer transition

- The create CTA and the designer's home-logo link use the browser View
  Transitions API. The two logos and navigation remain visually continuous;
  the logos smoothly resize and reposition into the compact designer header.
- Page content crossfades with a subtle upward entrance (20px), reversed when
  returning home. Total motion is **520ms**, with
  `cubic-bezier(0.22, 1, 0.36, 1)` easing and no whole-editor scaling.
  The white landing surface blends into the designer's warm orange surface.
- Wait for the actual destination page, initial canvas frame, and canvas
  measurement before taking the destination snapshot. Open the automatic
  how-it-works dialog after the transition finishes.
- Unsupported browsers and reduced-motion users navigate normally. Links retain
  native new-tab/modifier behavior, prefetching, and event-mode query parameters.
- Shared orchestration lives in `components/navigation/PageTransition.tsx`;
  snapshot animations live in `app/globals.css`. A bounded timeout skips motion
  on a slow route so navigation cannot leave a frozen snapshot on screen.

## 8. Card designer (`/design`)

### Surfaces and typography

- The header is white. Below it, the editor surface is **orange `#f99d21` at
  35% opacity over white**, implemented as a flat translucent gradient over a
  white background (not opacity on the container or its contents).
  The route root is a full-viewport-height flex column, with the editor growing
  to fill all remaining space below the header. Do not calculate its height by
  subtracting a fixed header height; that leaves a white footer at some sizes.
- The heading is Circular Std Black in dark orange. Desktop uses two lines,
  “Design your” / “thank you card”, at `clamp(36px, 3.35vw, 64px)`.
  At <=1100px the explicit line break is removed; mobile type is
  `clamp(24px, 7.1vw, 36px)` and wraps naturally on the narrowest screens.
- Body copy uses Caslon; tab labels and action buttons use Circular Std Black.
- The shared `SiteHeader` uses the same `LandingNav`, links, and mobile dropdown
  as the landing page. Its `compact` variant reduces the
  desktop AIC logo to `clamp(90px, 6vw, 116px)` and CCD logo to
  `clamp(148px, 9.8vw, 188px)`.
- On mobile, the designer's compact header uses smaller logos to fit comfortably
  within its padding: AIC `clamp(44px, 12vw, 56px)`, CCD
  `clamp(72px, 20vw, 90px)`, with a 12px gap. Header padding is
  `8px 5% 8px 8%`; the navigation toggle retains its 44px hit area.

### Palette and responsive layout

- Tab order: **Frames → CCP Stickers → Messages → Stickers**. Messages is the
  initially selected tab; the initial frame is the orange heart (`frame_6.webp`).
- Tabs sit directly on the orange surface. The active tab has a white fill,
  rounded top corners, and curved lower joins into the white palette. Labels
  use purple; thin purple separators appear between adjacent inactive tabs.
  Separators are hidden on both sides of the active tab.
- The first and last active tabs omit their outward-facing lower join. The
  palette's corresponding top corner becomes square so it meets the active tab
  flush, without a protruding white shape; inward-facing joins remain curved.
- Tabs use accessible tab/tabpanel roles, a roving tab stop, and
  Left/Right/Home/End keyboard selection.
- Above 1100px, the palette has three columns and vertical scrolling.
  At <=1100px it has **two rows scrolling horizontally**, with all four tabs
  visible. On mobile the palette is 158px tall to keep the card nearby.
- Palette items support click/tap-to-add as well as desktop drag-and-drop;
  frame items select the background and show an outlined selected state.
- Palette item gutters are **0 on all screen sizes**; the artwork's built-in
  transparent safe zones provide the spacing between images.
- Palette item boxes and their selector borders preserve the artwork ratios:
  **frames 64:53**, **CCP stickers 4:5**, **messages and stickers 1:1**.
  Use `object-fit: contain` without scaling or cropping; keep the complete
  asset visible, including its transparent padding. Desktop rows size naturally
  to their items. In the horizontal tray, category-specific column widths derive
  from the 90px row height (70px on mobile) and the item's aspect ratio.
- Mobile maximizes thumbnail space within the same 158px tray: `1px 2px`
  internal padding, a 2px white border, zero item gutters, and a thin
  violet scrollbar. Keep full artwork and its aspect ratio visible as items grow.
- Scrollbars use violet thumbs and a white-tinted light-violet track, including
  the document scrollbar on this route. Native overlay scrollbar visibility
  still follows the browser/OS. Both standard and WebKit styling are supplied.
- Mobile Chromium/WebKit palette and help-dialog scrollbars use 10px tracks
  with violet triangular arrow buttons at each end, horizontal or vertical as
  appropriate. The WebKit rules opt out of standard scrollbar overrides so the
  buttons can render; browsers/OSes without native scrollbar-button support
  retain their native scrolling behavior and the standard styled fallback.
- Wide desktop: library on the left, canvas and actions in the middle,
  instructions on the right. At <=1550px instructions move beneath the canvas;
  at <=1100px the library stacks above the workspace.
- The canvas keeps a CSS `64 / 53` aspect ratio independent of JavaScript
  measurement. A ResizeObserver scales the internal 443px editing coordinate
  system to fit, including scaling upward on desktop. Exports retain that
  internal capture surface. The viewport has 9% rounded corners.

### Controls and help

- Three orange, dark-purple outlined action buttons: **Restart**, **Submit**,
  **Download**. Use `icon_restart.svg`, `icon_send.svg`, and
  `icon_download.svg` from `public/assets/misc/`.
- Preserve the landing's raised resting state, lowered mouse hover, flat press,
  visible keyboard focus, and reduced-motion behavior. Desktop buttons have
  22px radii and 3px outlines, reducing to 17px on smaller desktops and 8px /
  1.5px outlines on mobile. Labels have a 14px minimum and can wrap the action
  row at very narrow widths rather than clipping.
- Editing instructions are italic Caslon. Their circular dark-purple badges
  use the same Lucide `RotateCw`, `Maximize2`, and `X` icons as the canvas
  handles. Canvas handles also use dark-purple circles with white icons.
- “How it works” sits above the canvas, aligned right. Its pill background is
  **orange at 53% opacity**; text and the question icon are **`#a37d4f`**, with
  a white icon interior.
- The how-it-works popup opens **automatically on every arrival at `/design`**;
  the pill reopens it after dismissal. The popup follows the supplied desktop
  and mobile references: a cream `#fff9ed` panel, purple Circular Std Black
  heading, medium-weight Circular step labels, lavender numbered circles with
  **upright Caslon Doric Semibold (600)** numbers, and an outlined orange
  “Let’s start” button. The CTA uses the same **raised resting state**, lowered
  mouse hover, flat pressed state, and reduced-motion behavior as the editor
  action buttons (5px desktop / 3px mobile hard shadow at rest).
- Use the existing `icon_design.svg`, `icon_message.svg`, `icon_avatar.svg`,
  and `icon_submit.svg` assets for the four steps. Rotate `icon_arrow.svg` for
  the vertical dotted connectors. Desktop step rows contain number, icon, and
  label inline. On mobile the icon is above the number/label row; the heading
  and final step use mobile-specific line breaks.
- The panel is at most 1288px wide on desktop, with 52px corners at 1920px.
  Mobile uses `min(420px, 100% - 64px)` width and 24px corners. Limit the modal
  to the viewport height and allow internal scrolling on short screens; use
  more compact desktop steps when viewport height is <=850px.
- **Every modal** uses the shared native `Modal` component and the global
  `dialog::backdrop` treatment: **`#241f61` at 59% opacity** with **4px backdrop
  blur**. This applies to help, restart confirmation, download/QR notices,
  submission notices, and errors. Background page scrolling is locked while
  a modal is open.
- All modals share a subtle **220ms entrance**: fade in with a **10px upward
  settle**, using `cubic-bezier(0.22, 1, 0.36, 1)`. Exit is a quicker **160ms**
  fade with a **6px downward drift**, using `ease-in`. The backdrop fades on
  matching timings while retaining its purple tint and 4px blur; no bounce or
  scale effects. Motion lives in `app/globals.css`.
- The shared `Modal` retains its last content throughout exit, including when a
  notice is cleared. Keep the native dialog open, focus contained, and background
  scroll locked until the exit finishes; then restore focus and remove retained
  content. Reopening cancels a pending close. Reduced-motion users get immediate
  opening and dismissal. Updates within an already-open notice do not replay
  its entrance.
- Clicking outside the panel or pressing Escape dismisses any modal. Clicking
  inside does not dismiss it. Native modal focus containment and restoration
  are preserved. The help popup also closes through its labeled top-right
  close button (44px hit area) and “Let’s start”; initial focus is on the dialog
  itself, not the X or CTA, so no control is pre-highlighted and short screens
  begin at the top of the instructions. Keyboard users can Tab to the controls.
- Focusing the dialog container itself adds **no outline or other focus-only
  styling**. Retain visible keyboard focus indicators on buttons and links
  inside the dialog.

### Clear, download, and submission modals

- These notices reuse the how-it-works cream surface, purple headings, local
  Circular typography, lavender top-right X, shared backdrop, and native-dialog
  dismissal/focus behavior. They are at most **760px wide** on desktop, with
  `76px 80px 64px` content padding. On mobile they use
  `min(430px, 100% - 32px)` width and `58px 24px 38px` padding, preserving room
  for artwork and labels. All help and notice panels disable horizontal
  overflow, including the transparent bounds of decorative stickers. Card
  previews, QR codes, and thank-you artwork also scale against viewport height;
  desktops at <=850px height use tighter spacing and smaller controls. Vertical
  scrolling is a fallback only when content cannot fit on a short viewport;
  never clip essential copy or actions to hide overflow.
- Actions form a full-width vertical stack: orange fills, dark-purple outlines,
  and the same raised resting / lowered mouse hover / flat pressed states as
  the help CTA. Desktop buttons have 64px minimum height and 17px corners;
  mobile uses 44px minimum height, 8px corners, and 1.5px outlines. Keep visible
  keyboard focus and reduced-motion support on buttons and button-styled links.
- **Clear:** “Clear your card?” and “All unsaved progress will be lost. Would
  you like to proceed?”; actions are **Cancel**, then **Clear**. The destructive
  action uses **`#e84221` with white text**. Confirming resets the frame, stickers,
  and editor selection to a fresh card.
- **Regular download:** `messages/msg_9.webp` supplies the “Thank you” artwork,
  followed by “for participating!” and “Your download will start shortly.”
  Actions: **Back to my card**, **Make a new card**, **Share with a friend**.
  Sharing uses the Web Share API with the downloaded card file where supported,
  otherwise the site link; browsers without native sharing copy the site link
  and show inline feedback. Making a new card resets the editor.
- **Event download (`event=true`):** upload the image using the existing download
  endpoint and render a QR code for its hosted image URL. Heading: “Scan the QR
  code to download the image into your mobile.” The QR opens that same image
  when clicked. Follow it with the tap-and-hold saving instructions and thank-you
  copy; actions are **Back to my card** and **Close**, both dismissing the modal.
- **Submission:** “Card submitted!” appears above a preview of the exact image
  blob sent to the API. Decorate its top-left with `stickers/sticker_6.webp` and
  bottom-right with `stickers/sticker_1.webp`, retaining their transparent safe
  zones. Below it, regular mode says only “Thank you!” with **View my card**
  (links to `/display?card=<submitted card ID>` for a client-local replay of the
  wall's new-card entrance) and **Close**. Event mode adds “Now look out for it on
  our display wall.” and has only **Close**. Closing preserves the editor's card.

## 9. Floating display wall and personal replay (`/display?card=<ID>`)

- The scrolling card area spans the full viewport width, without horizontal
  page padding. The header and loading/empty copy retain their 24px side inset.
- The black header has the AIC and CCD logos at the top left, in their original
  colors, at 64px / 120px wide (48px / 90px on phones). Its centered white title
  is “Celebrating Community Care Day • 1 Nov” in Circular Std Medium (500).
  At <=1000px the title moves to its own centered row beneath the logos.
- The fixed bottom-center **Create your thank you card** CTA directly reuses
  the landing's primary-button classes: orange fill, dark-purple outline/text
  and hard shadow, Circular Std Black, responsive radii, raised resting state,
  lowered mouse hover, flat press, and reduced-motion transition behavior. A
  width-constrained container supplies its `cqw` sizing; keyboard focus remains
  visibly outlined. The CTA is hidden in event mode.
- The experimental wall uses `components/display/floatingWall.ts`: cards drift
  slowly left with independent depth/speed, gentle vertical bobbing, and small
  rotations. Two to six invisible height bands keep the composition filled;
  staggered placement, varied sizes (78–100%), and independently phased movement
  soften the grid. The black surface has a subtle dark-purple radial wash.
- Fill cards are dealt from shuffled, balanced decks across heights. The deal
  order rotates between columns and avoids a card's previous height (borrowing
  from the collection when the deck's final card needs a different height),
  preventing repeated images from being locked to
  one row when the submission count is a multiple of the number of bands.
  Off-screen cards draw from the deck again, so the gallery keeps changing and
  all submissions cycle through without mounting the entire collection.
- After its image loads, the requested published card glides from a floating
  tile to the center, straightens and enlarges over one second, holds for five
  seconds, then smoothly returns to its moving tile over 1.1 seconds. Its full
  artwork stays visible, with a soft violet drop shadow rather than clipped
  corners. The background cards gently dim while a card is featured.
- The replay runs once per requested ID in that browser's wall instance, without
  changing stored cards or triggering animations on other displays.
- Highlights fit both the wall height and phone width (maximum 82% of viewport
  width), centered slightly above the wall midpoint to leave space for the CTA.
  Live arrivals queue individually. After 14 idle seconds, an older card takes
  a turn in the spotlight without arrival confetti.
- Reduced motion freezes drifting/bobbing/rotation, disables automatic
  spotlights, and shows requested/live highlights immediately without travel.
- Event mode retains its live new-arrival behavior and ignores the card parameter.
- On this experimental branch, live arrivals and personal replays emit one short
  confetti burst from the card's sides, starting 650ms into growth. The 36 small
  orange, light-yellow, violet, dark-orange, and white pieces fan out, tumble,
  and fall away within about three seconds; they sit behind the complete card
  artwork and disappear before it rejoins the wall. No label or extra halo is
  added. Confetti is hidden for reduced-motion users.

## 10. Maintaining this guide

Use the existing CSS module and components as the exact implementation reference
when porting styles. Update this document when approved colors, font roles,
button behavior, radii, or responsive decisions change. Check narrow-screen
layout, readable CTA labels, touch/keyboard interaction, and reduced motion
when making visual changes.
