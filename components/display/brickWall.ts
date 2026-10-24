import type { Id } from "@/convex/_generated/dataModel";
import { CARD_ASPECT_RATIO } from "@/lib/card-maker/constants";
import { settleWall, type SpringBody, type WallParticle } from "./wallPhysics";

export type WallCard = { _id: Id<"cards">; _creationTime: number; url: string };

export type WallSnapshot = {
  cell: number;
  cellWidth: number;
  bigSize: number;
  bigWidth: number;
  bricks: { key: string; url: string; depth: number }[];
  features: { key: string; url: string }[];
};

const ROWS = 8;
// Keep open air between lanes rather than sizing artwork to fill the row pitch.
const ROW_FILL = 0.76;
const SPAN_ROWS = 4;
const BIG_CELLS = 3.4;
// Feature gaps reserve room across neighboring rows while the normal slots follow card sizes.
const GAP_CELLS = 5;
const SPEED_PX_PER_S = 28;
const GROW_MS = 900;
const BIG_MS = 5000;
const MAX_FRAME_MS = 100;
// Matches .floatingCard padding so the shrinking card lands exactly on the brick image.
const BRICK_PADDING = 4;
const MIN_SCALE = 0.7;
const SCALE_RANGE = 0.85;

// Each occurrence keeps its own motion, including when a featured card rejoins.
type FloatMotion = {
  depth: number;
  rotation: number;
  phase: number;
  period: number;
  drift: number;
  body: SpringBody;
};

function createMotion(): FloatMotion {
  return {
    depth: Math.random(),
    rotation: (Math.random() - 0.5) * 14,
    phase: Math.random() * Math.PI * 2,
    period: 12 + Math.random() * 6,
    drift: 0.06 + Math.random() * 0.04,
    body: { x: 0, y: 0, vx: 0, vy: 0 },
  };
}

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
  motion: FloatMotion;
};
type Brick = { kind: "brick"; key: string; card: WallCard; motion: FloatMotion };
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
  private replayedCardId: string | undefined;
  private elapsed = 0;
  private reducedMotion = false;
  private needsSettle = true;
  private visibleBricks = new Set<string>();

  constructor(private readonly elements: Map<string, HTMLElement>) {}

  /** Advances one frame and returns true when the set of rendered elements changed. */
  tick(dtMs: number, cards: WallCard[] | undefined, width: number, height: number, replayCardId?: string, reducedMotion = false): boolean {
    if (!cards || width <= 0 || height < ROWS) return false;

    let changed = false;
    const motionChanged = reducedMotion !== this.reducedMotion;
    this.reducedMotion = reducedMotion;
    const resized = width !== this.width || height !== this.height;
    if (resized || motionChanged || (cards !== this.syncedCards && (this.reducedMotion || !this.hasBricks()))) {
      this.build(cards, width, height);
      changed = true;
    } else if (cards !== this.syncedCards) {
      this.sync(cards);
      changed = true;
    }

    // Replay a published card as a new arrival on this wall only, once per requested ID.
    if (!this.reducedMotion && replayCardId && replayCardId !== this.replayedCardId) {
      const card = cards.find((card) => card._id === replayCardId);
      if (card) {
        const feature = this.features.find((feature) => feature.card._id === replayCardId);
        if (!feature) this.addFeature(card, true);
        this.replayedCardId = replayCardId;
        changed = true;
      }
    }

    const step = this.reducedMotion ? 0 : Math.min(Math.max(dtMs, 0), MAX_FRAME_MS);
    this.elapsed += step / 1000;
    if (this.animate(step)) changed = true;
    if (this.place(step / 1000)) changed = true;
    return changed;
  }

  snapshot(): WallSnapshot {
    return {
      cell: this.cell,
      cellWidth: this.cellWidth,
      bigSize: this.bigSize,
      bigWidth: this.bigWidth,
      bricks: this.rows.flatMap((row) => row.items.flatMap((item) => (
        item.kind === "brick" && this.visibleBricks.has(item.key)
          ? [{ key: item.key, url: item.card.url, depth: item.motion.depth }]
          : []
      ))),
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
    return Math.ceil((this.width + 3 * this.gapWidth) / (this.cellWidth * MIN_SCALE)) + 2;
  }

  private nextKey() {
    return String(this.keyCounter++);
  }

  private brick(card: WallCard, motion = createMotion()): Brick {
    return { kind: "brick", key: this.nextKey(), card, motion };
  }

  private get rowPitch() {
    return this.height / ROWS;
  }

  private get edgePadding() {
    return Math.max(12, this.cell * 0.16);
  }

  private floatingBounds(motion: FloatMotion) {
    const angle = (Math.abs(motion.rotation) + 2.5) * Math.PI / 180;
    const scale = MIN_SCALE + motion.depth * SCALE_RANGE + 0.018;
    const w = (this.cellWidth - BRICK_PADDING * 2) * scale;
    const h = (this.cell - BRICK_PADDING * 2) * scale;
    const drift = this.cell * motion.drift;
    return {
      halfWidth: (Math.cos(angle) * w + Math.sin(angle) * h) / 2 + drift * 0.7,
      halfHeight: (Math.sin(angle) * w + Math.cos(angle) * h) / 2 + drift,
    };
  }

  private rowCenter(row: number, halfHeight: number) {
    return Math.max(halfHeight + this.edgePadding,
      Math.min(this.height - halfHeight - this.edgePadding, (row + 0.5) * this.rowPitch));
  }

  private floating(motion: FloatMotion) {
    const phase = this.elapsed * Math.PI * 2 / motion.period + motion.phase;
    const amplitude = this.reducedMotion ? 0 : this.cell * motion.drift;
    return {
      x: Math.sin(phase) * amplitude * 0.7,
      y: Math.sin(phase) * amplitude,
      rotation: motion.rotation + (this.reducedMotion ? 0 : Math.sin(phase * 0.67) * 2.5),
      scale: MIN_SCALE + motion.depth * SCALE_RANGE + (this.reducedMotion ? 0 : Math.sin(phase * 0.59) * 0.018),
    };
  }

  private widthOf(item: Item) {
    return item.kind === "brick" ? this.brickWidth(item.motion) : item.width;
  }

  private brickWidth(motion: FloatMotion) {
    const angle = (Math.abs(motion.rotation) + 2.5) * Math.PI / 180;
    const scale = MIN_SCALE + motion.depth * SCALE_RANGE + 0.018;
    return ((this.cellWidth - BRICK_PADDING * 2) * Math.cos(angle)
      + (this.cell - BRICK_PADDING * 2) * Math.sin(angle)) * scale
      + this.cell * (0.34 + motion.drift * 1.4);
  }

  private hasBricks() {
    return this.rows.some((row) => row.items.some((item) => item.kind === "brick"));
  }

  private build(cards: WallCard[], width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cell = Math.floor(this.rowPitch * ROW_FILL);
    this.syncedCards = cards;
    // Oldest first so newer cards are added at the tail rather than reshuffling the wall.
    this.cards = [...cards].reverse();
    this.known = new Set(cards.map((card) => card._id));
    this.features = [];
    this.needsSettle = true;
    this.rows = Array.from({ length: ROWS }, (_, r) => ({ items: [], head: 0, offset: r % 2 ? this.cellWidth / 2 : 0 }));
    if (!this.cards.length) return;

    const perRow = Math.max(this.minBricks, Math.ceil(this.cards.length / ROWS));
    // Include every published card once before adding independently shuffled copies.
    shuffle([...this.cards]).forEach((card, i) => this.rows[i % ROWS].items.push(this.brick(card)));
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
      if (!this.reducedMotion) this.addFeature(card);
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
    for (const row of this.rows) {
      const bricks = Array.from({ length: row.items.length }, (_, i) => row.items[(row.head + i) % row.items.length])
        .filter((item): item is Brick => item.kind === "brick");
      const existing = new Set(bricks.map((brick) => brick.card._id));
      let count = bricks.length;
      let previous = bricks.at(-1)?.card._id;
      // Finish the row's current set before repeating cards. Every subsequent
      // batch gets a fresh shuffle, independent of other rows and earlier batches.
      let batch = shuffle(pool.filter((card) => !existing.has(card._id)));
      while (count < target) {
        if (!batch.length) batch = shuffle([...pool]);
        if (batch.length > 1 && batch[batch.length - 1]._id === previous) {
          const swap = Math.floor(Math.random() * (batch.length - 1));
          [batch[swap], batch[batch.length - 1]] = [batch[batch.length - 1], batch[swap]];
        }
        const card = batch.pop()!;
        insertAt(row, row.items.length, this.brick(card));
        previous = card._id;
        count++;
      }
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
      motion: createMotion(),
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
          row.items[i] = this.brick(feature.card, feature.motion);
          rejoined = true;
        } else {
          removeAt(row, i);
        }
      }
    }
    this.features = this.features.filter((f) => f !== feature);
    // If the gaps already scrolled off-screen, the card rejoins as a brick entering from the right.
    if (!rejoined) insertAt(this.rows[feature.homeRow], Infinity, this.brick(feature.card, feature.motion));
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
        const minWidth = this.isRejoining(item.feature) && item.row === item.feature.homeRow ? this.brickWidth(item.feature.motion) : 0;
        item.width = minWidth + (this.gapWidth - minWidth) * eased;
      }

      row.offset += move;
      for (let guard = row.items.length; guard > 0 && row.items.length; guard--) {
        const item = row.items[row.head];
        const width = this.widthOf(item);
        if (row.offset < width) break;
        // Let a changing gap finish before retiring it, so its neighbors do not jump.
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

  private place(seconds: number) {
    const bounds = new Map<Feature, { left: number; right: number }>();
    const homeSlots = new Map<Feature, number>();
    const particles: (WallParticle & { brick: Brick; rotation: number; scale: number; bobX: number; bobY: number })[] = [];

    this.rows.forEach((row, r) => {
      let x = -row.offset;
      const n = row.items.length;
      for (let i = 0; i < n; i++) {
        const item = row.items[(row.head + i) % n];
        const width = this.widthOf(item);
        if (item.kind === "brick") {
          if (x > -this.cellWidth * 3 && x < this.width + this.cellWidth * 3) {
            const float = this.floating(item.motion);
            // Reserve the full motion envelope; solve spacing around stable anchors.
            // Applying bobbing afterward prevents collision forces from cancelling it.
            const { halfWidth, halfHeight } = this.floatingBounds(item.motion);
            particles.push({
              brick: item,
              body: item.motion.body,
              anchorX: x + width / 2,
              anchorY: this.rowCenter(r, halfHeight),
              halfWidth,
              halfHeight,
              minY: halfHeight + this.edgePadding,
              maxY: this.height - halfHeight - this.edgePadding,
              mass: 0.6 + float.scale * float.scale,
              rotation: float.rotation,
              scale: float.scale,
              bobX: float.x,
              bobY: float.y,
            });
          } else {
            const element = this.elements.get(item.key);
            if (element) element.style.transform = `translate3d(-9999px, 0, 0)`;
            Object.assign(item.motion.body, { x: 0, y: 0, vx: 0, vy: 0 });
          }
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

    const visibleBricks = new Set(particles.map(({ brick }) => brick.key));
    const visibilityChanged = visibleBricks.size !== this.visibleBricks.size
      || [...visibleBricks].some((key) => !this.visibleBricks.has(key));
    this.visibleBricks = visibleBricks;

    settleWall(particles, this.needsSettle ? 0.8 : seconds, this.cell * 0.06);
    this.needsSettle = false;
    for (const p of particles) {
      const element = this.elements.get(p.brick.key);
      if (!element) continue;
      const x = p.anchorX + p.body.x + p.bobX - this.cellWidth / 2;
      const y = p.anchorY + p.body.y + p.bobY - this.cell / 2;
      element.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${p.rotation}deg) scale(${p.scale})`;
    }

    for (const feature of this.features) {
      const bound = bounds.get(feature);
      const element = this.elements.get(feature.key);
      if (!bound || !element) continue;
      feature.centerX = (bound.left + bound.right) / 2;
      let x = feature.centerX;
      let y = (feature.row + SPAN_ROWS / 2) * this.rowPitch;
      let scale = easeOutBack(feature.progress);

      const homeX = homeSlots.get(feature);
      if (this.isRejoining(feature) && homeX !== undefined) {
        // Glide from the big position into the brick slot, shrinking to brick size as the gap closes.
        const eased = easeInOutCubic(feature.progress);
        const brickSize = this.cell - BRICK_PADDING * 2;
        x = homeX + (x - homeX) * eased;
        const homeY = this.rowCenter(feature.homeRow, this.floatingBounds(feature.motion).halfHeight);
        y = homeY + (y - homeY) * eased;
        scale = (brickSize + (this.bigSize - brickSize) * eased) / this.bigSize;
      }
      const float = this.floating(feature.motion);
      const presence = easeInOutCubic(feature.progress);
      const driftWeight = 1 - presence * 0.65;
      x += (float.x + feature.motion.body.x) * driftWeight;
      y += (float.y + feature.motion.body.y) * driftWeight;
      scale *= float.scale + (1 - float.scale) * presence;
      const rotation = float.rotation * (1 - presence * 0.75);
      const radians = rotation * Math.PI / 180;
      const rotatedHeight = Math.abs(Math.sin(radians)) * this.bigWidth + Math.abs(Math.cos(radians)) * this.bigSize;
      scale = Math.min(scale, (this.height - this.edgePadding * 2) / rotatedHeight);
      const halfHeight = rotatedHeight * scale / 2;
      y = Math.max(halfHeight + this.edgePadding, Math.min(this.height - halfHeight - this.edgePadding, y));
      element.style.transform = `translate3d(${x - this.bigWidth / 2}px, ${y - this.bigSize / 2}px, 0) rotate(${rotation}deg) scale(${scale})`;
    }
    return visibilityChanged;
  }
}
