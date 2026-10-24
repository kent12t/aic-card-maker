# Display wall loading

The wall keeps its existing layout, motion, and arrival spotlight. Network loading
is separate from the animation so an image never enters the wall before decoding.

## Budgets

| Connection / viewport | Initial unique cards | Maximum resident cards | Concurrent downloads |
| --- | ---: | ---: | ---: |
| Mobile (up to 600 CSS px) | 16 | 32 | 3 |
| Larger screens | 24 | 100 | 3 |
| Data Saver or 2G | 8 | 8 | 2 |

The first eight decoded cards start a varied wall while the rest of the initial
pool finishes. Mobile connections add four historical images eight seconds after
the previous batch settles. Desktop adds eight images one second after each batch,
up to the latest 100 published cards returned by Convex. Both stop at their resident-card budget. Repeated wall
occurrences share decoded blob URLs; masks do not make separate storage downloads.
Hidden tabs pause loading and animation. Unmounting cancels outstanding requests
and revokes blob URLs. Removed cards are filtered immediately; fresh published
cards and the requested spotlight take priority over background images.

Historical prefetches enter a FIFO stream queue. On-screen cards never change
their artwork as more thumbnails finish loading. Each lane prepares only its next
fully off-screen right-hand slot, with rotation/drift/shadow clearance, preserving
that slot's geometry and spring motion. Queued downloads take priority over
duplicate filler, rather than waiting at the back of the long row ring. Once the
new-image queue drains, shuffled cycles give the full decoded pool regular turns.
All cards enter naturally from the right at the existing 28px/s scrolling speed;
loading all thumbnails does not mean every card becomes visible immediately.
Reduced-motion users retain the static wall instead of animated streaming.
Only real subscription arrivals and the explicitly requested card are featured.

## Thumbnails and compatibility

`GET /api/wall-thumbnail/[storageId]` resizes both existing and new PNG/WebP cards
to at most 384px wide, preserves alpha, and returns WebP at quality 65. Its CDN
cache lasts seven days, with a one-day browser cache. It only reads public storage
on the configured Convex deployment, validates UUIDs, limits input to 2 MiB / two
million pixels, and has an upstream timeout. It cannot proxy arbitrary URLs.

No database or storage migration is required. Originals are unchanged. New wall
submissions use 400×331 images; previews and event QR downloads remain full-size.
The shared backend validator accepts both 400×331 and 800×663, including tabs
opened before rollout. Do not remove the larger size while these clients exist.

Cold thumbnail requests still read originals server-side and incur image-processing
work; CDN caching is important. The transfer savings measured below are browser
bandwidth, not a claim that all server-side bandwidth disappears.

## Verification

`npm run test:render` covers Chromium and WebKit, including queue limits,
background batches, Data Saver, cancellation, retry, decoded-image rendering,
spotlight priority, moderation, live arrivals, thumbnail validation and upload
compatibility. Convex subscription tests use mocked WebSockets and never write
production data.

For read-only screenshots, video, transfer sizes, and frame timing:

```sh
node scripts/measure-wall.mjs --url=http://localhost:3001/display --output=test-results/wall-mobile
node scripts/measure-wall.mjs --url=http://localhost:3001/display --output=test-results/wall-data-saver --save-data=true
```

Use a production-mode local build, not `next dev`, for timing. The script emulates
390×844 at 2× device scale, 1.6 Mbps / 150 ms network latency, and 4× CPU slowdown.
It saves checkpoints at 1, 3, 8, 15, and 30 seconds. Compare the same public card
dataset, and run before/after serially to avoid competing for CPU. Frame statistics
exclude the first second of wall startup and screenshot capture windows.

An initial 2026-10-24 run against the current public dataset transferred 4.54 MiB
of images on production versus 0.43 MiB on the updated local build in 30 seconds
(about 91% less). The updated wall started around 5.4 seconds, had no full-size
browser requests, and sampled median/p95 frame intervals around 16.7 ms, with no
steady-state samples over 50 ms. These are desktop Chromium emulation results,
not physical-phone or hosted-CDN performance guarantees.
