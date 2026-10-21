import type { Id } from "@/convex/_generated/dataModel";
import { CARD_ASPECT_RATIO } from "@/lib/card-maker/constants";

export type WallCard = { _id: Id<"cards">; _creationTime: number; url: string };

export type WallSnapshot = {
  cell: number;
  cellWidth: number;
  bigSize: number;
  bigWidth: number;
  bricks: { key: string; url: string }[];
  features: { key: string; url: string }[];
};

const ROWS = 10;
const SPAN_ROWS = 4;
const BIG_CELLS = 3.4;
// Gaps are a whole number of bricks wide so rows keep their brick alignment after a gap passes.
const GAP_CELLS = 5;
const SPEED_PX_PER_S = 60;
const GROW_MS = 900;
const BIG_MS = 5000;
const MAX_FRAME_MS = 100;
// Matches the brick's `p-1` so the shrinking card lands exactly on the brick image.
const BRICK_PADDING = 4;

// `homeRow` is the row the card shrinks back into; `removed` means a moderator took it down, so it just disappears.
type Feature = {
  key: string;
  card: WallCard;
  row: number;
  homeRow: number;
  age: number;
  progress: number;
  closing: boolean;
  removed: boolean;
  centerX: number;
  gaps: number;
};
type Brick = { kind: "brick"; key: string; card: WallCard };
type Gap = { kind: "gap"; key: string; feature: Feature; row: number; width: number };
type Item = Brick | Gap;
// Each row is a ring of items read from `head`; `offset` is how far the head item has scrolled past the left edge.
type Row = { items: Item[]; head: number; offset: number };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const easeOutBack = (p: number) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2;

// Inserts at a position counted from the head; positions at or beyond the end go to the tail of the ring.
function insertAt(row: Row, walkPos: number, item: Item) {
  const n = row.items.length;
  const atTail = walkPos >= n;
  const index = atTail ? row.head : (row.head + walkPos) % n;
  row.items.splice(index, 0, item);
  if (atTail || index < row.head) row.head += 1;
  row.head %= row.items.length;
}

function removeAt(row: Row, index: number) {
  row.items.splice(index, 1);
  if (index < row.head) row.head -= 1;
  row.head = row.items.length ? row.head % row.items.length : 0;
}

function shuffle<T>(values: T[]) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export class BrickWall {
  private rows: Row[] = [];
  private features: Feature[] = [];
  private known = new Set<string>();
  private cards: WallCard[] = [];
  private syncedCards: WallCard[] | undefined;
  private width = 0;
  private height = 0;
  private cell = 0;
  private keyCounter = 0;
  private fillCounter = 0;
  private replayedCardId: string | undefined;

  constructor(private readonly elements: Map<string, HTMLElement>) {}

  /** Advances one frame and returns true when the set of rendered elements changed. */
  tick(dtMs: number, cards: WallCard[] | undefined, width: number, height: number, replayCardId?: string): boolean {
    if (!cards || width <= 0 || height < ROWS) return false;

    let changed = false;
    const resized = width !== this.width || height !== this.height;
    if (resized || (cards !== this.syncedCards && !this.hasBricks())) {
      this.build(cards, width, height);
      changed = true;
    } else if (cards !== this.syncedCards) {
      this.sync(cards);
      changed = true;
    }

    // Replay a published card as a new arrival on this wall only, once per requested ID.
    if (replayCardId && replayCardId !== this.replayedCardId) {
      const card = cards.find((card) => card._id === replayCardId);
      if (card) {
        const feature = this.features.find((feature) => feature.card._id === replayCardId);
        if (!feature) this.addFeature(card, true);
        this.replayedCardId = replayCardId;
        changed = true;
      }
    }

    if (this.animate(Math.min(dtMs, MAX_FRAME_MS))) changed = true;
    this.place();
    return changed;
  }

  snapshot(): WallSnapshot {
    return {
      cell: this.cell,
      cellWidth: this.cellWidth,
      bigSize: this.bigSize,
      bigWidth: this.bigWidth,
      bricks: this.rows.flatMap((row) => row.items.flatMap((item) => (item.kind === "brick" ? [{ key: item.key, url: item.card.url }] : []))),
      features: this.features.map((feature) => ({ key: feature.key, url: feature.card.url })),
    };
  }

  private get bigSize() {
    return this.cell * BIG_CELLS;
  }

  private get cellWidth() {
    return (this.cell - BRICK_PADDING * 2) * CARD_ASPECT_RATIO + BRICK_PADDING * 2;
  }

  private get bigWidth() {
    return this.bigSize * CARD_ASPECT_RATIO;
  }

  private get gapWidth() {
    return this.cellWidth * GAP_CELLS;
  }

  // Rings are longer than the screen plus a few gaps, so tail insertions and removals always happen off-screen.
  private get minBricks() {
    return Math.ceil((this.width + 3 * this.gapWidth) / this.cellWidth) + 2;
  }

  private nextKey() {
    return String(this.keyCounter++);
  }

  private brick(card: WallCard): Brick {
    return { kind: "brick", key: this.nextKey(), card };
  }

  private widthOf(item: Item) {
    return item.kind === "brick" ? this.cellWidth : item.width;
  }

  private hasBricks() {
    return this.rows.some((row) => row.items.some((item) => item.kind === "brick"));
  }

  private build(cards: WallCard[], width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cell = Math.floor(height / ROWS);
    this.syncedCards = cards;
    // Oldest first so newer cards are added at the tail rather than reshuffling the wall.
    this.cards = [...cards].reverse();
    this.known = new Set(cards.map((card) => card._id));
    this.features = [];
    this.rows = Array.from({ length: ROWS }, (_, r) => ({ items: [], head: 0, offset: r % 2 ? this.cellWidth / 2 : 0 }));
    if (!this.cards.length) return;

    const perRow = Math.max(this.minBricks, Math.ceil(this.cards.length / ROWS));
    this.fillRows(this.cards, perRow);
  }

  private sync(cards: WallCard[]) {
    this.syncedCards = cards;
    this.cards = [...cards].reverse();
    const ids = new Set<string>(cards.map((card) => card._id));

    for (const row of this.rows) {
      for (let i = row.items.length - 1; i >= 0; i--) {
        const item = row.items[i];
        if (item.kind === "brick" && !ids.has(item.card._id)) removeAt(row, i);
      }
    }
    for (const feature of this.features) {
      if (ids.has(feature.card._id)) continue;
      feature.closing = true;
      feature.removed = true;
    }

    for (const card of this.cards) {
      if (this.known.has(card._id)) continue;
      this.known.add(card._id);
      this.addFeature(card);
    }
    this.refill();
  }

  private refill() {
    const featuring = new Set<string>(this.features.map((feature) => feature.card._id));
    const pool = this.cards.filter((card) => !featuring.has(card._id));
    if (!pool.length) return;
    this.fillRows(pool, this.minBricks);
  }

  private fillRows(pool: WallCard[], target: number) {
    const counts = this.rows.map((row) => row.items.filter((item) => item.kind === "brick").length);
    let missing = counts.reduce((total, count) => total + Math.max(0, target - count), 0);
    while (missing > 0) {
      // Shift each pass by one row so repeated copies don't stay in their original row,
      // even when the number of cards is a multiple of the number of rows.
      for (let i = 0; i < pool.length && missing > 0; i++) {
        const r = (i + this.fillCounter) % ROWS;
        if (counts[r] >= target) continue;
        const row = this.rows[r];
        insertAt(row, row.items.length, this.brick(pool[i]));
        counts[r]++;
        missing--;
      }
      this.fillCounter = (this.fillCounter + 1) % ROWS;
    }
  }

  private addFeature(card: WallCard, personal = false) {
    const gap = this.gapWidth;
    const starts = shuffle(Array.from({ length: ROWS - SPAN_ROWS + 1 }, (_, i) => i));
    let start = starts[0];
    // Leave room for the full gap to open to the right, including beyond a phone's edge.
    const preferredX = personal ? Math.max(this.width * 0.85, gap / 2 + this.cellWidth) : this.width * 0.7;
    let centerX = preferredX;

    // Pick rows that don't collide with another big card; push further right if the screen is crowded.
    search: for (let attempt = 0; attempt < 4; attempt++) {
      const x = preferredX + attempt * gap;
      for (const r of starts) {
        const free = this.features.every((f) => Math.abs(f.row - r) >= SPAN_ROWS || Math.abs(f.centerX - x) >= gap * 1.2);
        if (free) {
          start = r;
          centerX = x;
          break search;
        }
      }
    }

    const feature: Feature = {
      key: this.nextKey(),
      card,
      row: start,
      homeRow: start + Math.floor(Math.random() * SPAN_ROWS),
      age: 0,
      progress: 0,
      closing: false,
      removed: false,
      centerX,
      gaps: 0,
    };
    for (let r = start; r < start + SPAN_ROWS; r++) {
      const row = this.rows[r];
      if (!row.items.length) continue;
      // Keep each gap on its row's existing brick boundary so alternating rows stay staggered.
      let x = -row.offset;
      let best = 1;
      let bestDistance = Infinity;
      for (let i = 0; i < row.items.length; i++) {
        const distance = Math.abs(x - (centerX - gap / 2));
        if (i > 0 && distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
        x += this.widthOf(row.items[(row.head + i) % row.items.length]);
      }
      insertAt(row, best, { kind: "gap", key: this.nextKey(), feature, row: r, width: 0 });
      feature.gaps++;
    }
    this.features.push(feature);
  }

  private dropFeature(feature: Feature) {
    let rejoined = feature.removed;
    for (const row of this.rows) {
      for (let i = row.items.length - 1; i >= 0; i--) {
        const item = row.items[i];
        if (item.kind !== "gap" || item.feature !== feature) continue;
        // The home gap has shrunk to one brick wide, so swapping in the brick causes no visible jump.
        if (!rejoined && item.row === feature.homeRow) {
          row.items[i] = this.brick(feature.card);
          rejoined = true;
        } else {
          removeAt(row, i);
        }
      }
    }
    this.features = this.features.filter((f) => f !== feature);
    // If the gaps already scrolled off-screen, the card rejoins as a brick entering from the right.
    if (!rejoined) insertAt(this.rows[feature.homeRow], Infinity, this.brick(feature.card));
  }

  private isRejoining(feature: Feature) {
    return feature.closing && !feature.removed;
  }

  private animate(dtMs: number) {
    let changed = false;
    const step = dtMs / GROW_MS;

    for (const feature of [...this.features]) {
      feature.age += dtMs;
      if (feature.age >= GROW_MS + BIG_MS) feature.closing = true;
      feature.progress = clamp01(feature.progress + (feature.closing ? -step : step));
      if (feature.closing && feature.progress === 0) {
        this.dropFeature(feature);
        changed = true;
      }
    }

    const move = (dtMs * SPEED_PX_PER_S) / 1000;
    for (const row of this.rows) {
      for (const item of row.items) {
        if (item.kind !== "gap") continue;
        const eased = easeInOutCubic(item.feature.progress);
        // While rejoining, the home row's gap closes down to one brick-sized slot for the card to land in.
        const minWidth = this.isRejoining(item.feature) && item.row === item.feature.homeRow ? this.cellWidth : 0;
        item.width = minWidth + (this.gapWidth - minWidth) * eased;
      }

      row.offset += move;
      for (let guard = row.items.length; guard > 0 && row.items.length; guard--) {
        const item = row.items[row.head];
        const width = this.widthOf(item);
        if (row.offset < width) break;
        // A changing gap can already be off-screen, but removing its fractional
        // brick width would permanently shift this row's stagger. Let it finish
        // opening or closing before retiring it from the ring.
        if (item.kind === "gap" && item.feature.progress < 1) break;
        row.offset -= width;
        if (item.kind === "gap") {
          // Gaps are dropped once they scroll off the left edge instead of looping back around.
          removeAt(row, row.head);
          item.feature.gaps -= 1;
          if (item.feature.gaps === 0) {
            this.dropFeature(item.feature);
            changed = true;
          }
        } else {
          row.head = (row.head + 1) % row.items.length;
        }
      }
    }
    return changed;
  }

  private place() {
    const bounds = new Map<Feature, { left: number; right: number }>();
    const homeSlots = new Map<Feature, number>();

    this.rows.forEach((row, r) => {
      let x = -row.offset;
      const n = row.items.length;
      for (let i = 0; i < n; i++) {
        const item = row.items[(row.head + i) % n];
        const width = this.widthOf(item);
        if (item.kind === "brick") {
          const element = this.elements.get(item.key);
          if (element) element.style.transform = `translate3d(${x}px, ${r * this.cell}px, 0)`;
        } else {
          const bound = bounds.get(item.feature) ?? { left: -Infinity, right: Infinity };
          bound.left = Math.max(bound.left, x);
          bound.right = Math.min(bound.right, x + width);
          bounds.set(item.feature, bound);
          if (item.row === item.feature.homeRow) homeSlots.set(item.feature, x + width / 2);
        }
        x += width;
      }
    });

    for (const feature of this.features) {
      const bound = bounds.get(feature);
      const element = this.elements.get(feature.key);
      if (!bound || !element) continue;
      feature.centerX = (bound.left + bound.right) / 2;
      let x = feature.centerX;
      let y = (feature.row + SPAN_ROWS / 2) * this.cell;
      let scale = easeOutBack(feature.progress);

      const homeX = homeSlots.get(feature);
      if (this.isRejoining(feature) && homeX !== undefined) {
        // Glide from the big position into the brick slot, shrinking to brick size as the gap closes.
        const eased = easeInOutCubic(feature.progress);
        const brickSize = this.cell - BRICK_PADDING * 2;
        x = homeX + (x - homeX) * eased;
        y = (feature.homeRow + 0.5) * this.cell + (y - (feature.homeRow + 0.5) * this.cell) * eased;
        scale = (brickSize + (this.bigSize - brickSize) * eased) / this.bigSize;
      }
      element.style.transform = `translate3d(${x - this.bigWidth / 2}px, ${y - this.bigSize / 2}px, 0) scale(${scale})`;
    }
  }
}
