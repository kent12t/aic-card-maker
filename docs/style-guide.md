# Community Care Day UI style guide

This is the persistent design reference for future agents working on the UI.
It records the implemented landing page and the user's refinements, including
the smaller mobile card stack, wider mobile copy, larger mobile step icons, and
buttons that start raised. Use this visual language when updating the designer.

## Source of truth

| File | Responsibility |
| --- | --- |
| `app/globals.css` | Global color variables; existing app defaults |
| `app/page.tsx` | Landing markup, local font loading, links |
| `app/page.module.css` | Landing layout, typography, buttons, motion, breakpoints |
| `components/landing/LandingNav.tsx` | Desktop links and mobile dropdown |
| `components/landing/CardDeck.tsx` | Animated cards and pause control |
| `app/design/page.tsx` | Existing card designer, moved from `/` |

The landing font variables are currently scoped to its root element. The global
body and existing designer still use Open Sans and older color values. To apply
the new typography to other routes, load the fonts in a shared layout/module or
apply the same local-font setup and variable classes to those routes. Merely
referencing `--font-circular` or `--font-caslon` outside that scope is insufficient.

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

## 8. Maintaining this guide

Use the existing CSS module and components as the exact implementation reference
when porting styles. Update this document when approved colors, font roles,
button behavior, radii, or responsive decisions change. Check narrow-screen
layout, readable CTA labels, touch/keyboard interaction, and reduced motion
when making visual changes.
