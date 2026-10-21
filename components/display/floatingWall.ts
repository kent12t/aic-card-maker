import { CARD_ASPECT_RATIO } from "@/lib/card-maker/constants";
import type { WallCard } from "./brickWall";

export type FloatingSnapshot = {
  cardWidth: number;
  cardHeight: number;
  featureWidth: number;
  featureHeight: number;
  cards: { key: string; url: string }[];
  features: { key: string; url: string; celebrate: boolean }[];
};

type Floater = {
  key: string;
  card: WallCard;
  lane: number;
  x: number;
  phase: number;
  depth: number;
  speed: number;
  tilt: number;
};
type Request = { card: WallCard; celebrate: boolean };
type Feature = Request & { key: string; tile: Floater; age: number };
const ENTER_MS = 1000;
const HOLD_MS = 5000;
const EXIT_MS = 1100;
const FEATURE_MS = ENTER_MS + HOLD_MS + EXIT_MS;
const ease = (p: number) => p * p * (3 - 2 * p);

export class FloatingWall {
  private tiles: Floater[] = [];
  private feature: Feature | undefined;
  private pending: Request[] = [];
  private cards: WallCard[] = [];
  private synced: WallCard[] | undefined;
  private deck: WallCard[] = [];
  private lastLane = new Map<string, number>();
  private replayedId: string | undefined;
  private width = 0;
  private height = 0;
  private lanes = 5;
  private clock = 0;
  private idle = 0;
  private sequence = 0;
  private spotlightIndex = 0;
  private reducedMotion = false;
  private cardHeight = 0;
  private featureHeight = 0;

  constructor(private readonly elements: Map<string, HTMLElement>) {}

  tick(dt: number, cards: WallCard[] | undefined, width: number, height: number, replayId?: string, reducedMotion = false) {
    if (!cards || width <= 0 || height <= 0) return false;
    dt = Math.min(Math.max(dt, 0), 100);
    this.reducedMotion = reducedMotion;
    let changed = false;
    if (cards !== this.synced) {
      const previous = new Set(this.cards.map((card) => card._id));
      const ids = new Set(cards.map((card) => card._id));
      if (this.synced) {
        this.pending.push(...cards.filter((card) => !previous.has(card._id)).reverse().map((card) => ({ card, celebrate: true })));
      }
      this.cards = cards;
      this.synced = cards;
      this.deck = [];
      this.pending = this.pending.filter(({ card }) => ids.has(card._id));
      if (this.feature && !ids.has(this.feature.card._id)) this.feature = undefined;
      for (const tile of this.tiles) {
        if (!ids.has(tile.card._id) && cards.length) tile.card = this.takeCard(tile.lane);
      }
      if (!cards.length) this.tiles = [];
      changed = true;
    }

    if (width !== this.width || height !== this.height || (!this.tiles.length && cards.length)) {
      this.build(width, height);
      changed = true;
    }
    if (replayId && replayId !== this.replayedId) {
      const card = cards.find((card) => card._id === replayId);
      if (card) {
        this.pending = this.pending.filter((request) => request.card._id !== replayId);
        this.pending.unshift({ card, celebrate: true });
        this.replayedId = replayId;
      }
    }

    if (!reducedMotion) this.clock += dt / 1000;
    this.idle += dt;
    for (const tile of this.tiles) {
      if (!reducedMotion) tile.x -= tile.speed * dt / 1000;
      if (tile.x < -this.cardWidth * 1.4 && tile !== this.feature?.tile) {
        const laneTiles = this.tiles.filter((other) => other.lane === tile.lane && other !== tile);
        tile.x = Math.max(this.width + this.cardWidth * 0.5, ...laneTiles.map((other) => other.x + this.cardWidth * 1.22));
        tile.card = this.takeCard(tile.lane);
        changed = true;
      }
    }
    // A nearer card can move faster, but must not pile onto its slower neighbour.
    for (let lane = 0; lane < this.lanes; lane++) {
      const ordered = this.tiles.filter((tile) => tile.lane === lane).sort((a, b) => a.x - b.x);
      for (let i = 1; i < ordered.length; i++) {
        ordered[i].x = Math.max(ordered[i].x, ordered[i - 1].x + this.cardWidth * 1.08);
      }
    }
    if (this.feature) {
      this.feature.age += dt;
      if (this.feature.age >= FEATURE_MS) {
        this.feature = undefined;
        this.idle = 0;
        changed = true;
      }
    }
    if (!this.feature && this.tiles.length) {
      const request = this.pending.shift();
      // Older submissions get a readable turn too, without repeating the arrival confetti.
      if (request || (!reducedMotion && this.idle >= 14000)) {
        const next = request ?? { card: cards[this.spotlightIndex++ % cards.length], celebrate: false };
        this.startFeature(next);
        changed = true;
      }
    }
    this.place();
    return changed;
  }

  snapshot(): FloatingSnapshot {
    return {
      cardWidth: this.cardWidth,
      cardHeight: this.cardHeight,
      featureWidth: this.featureHeight * CARD_ASPECT_RATIO,
      featureHeight: this.featureHeight,
      cards: this.tiles.map(({ key, card }) => ({ key, url: card.url })),
      features: this.feature ? [{ key: this.feature.key, url: this.feature.card.url, celebrate: this.feature.celebrate }] : [],
    };
  }

  private get cardWidth() { return this.cardHeight * CARD_ASPECT_RATIO; }

  private takeCard(lane: number): WallCard {
    if (!this.deck.length) {
      this.deck = [...this.cards];
      for (let i = this.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
      }
    }
    const index = this.deck.findIndex((card) => this.lastLane.get(card._id) !== lane);
    if (index < 0) {
      // A deck's final card may have just appeared at this height. Borrow a
      // different card instead; leave that final card for another height.
      const alternate = this.cards.find((card) => this.lastLane.get(card._id) !== lane);
      if (alternate) {
        this.lastLane.set(alternate._id, lane);
        return alternate;
      }
    }
    const [card] = this.deck.splice(index < 0 ? 0 : index, 1);
    this.lastLane.set(card._id, lane);
    return card;
  }

  private build(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.lanes = Math.max(2, Math.min(6, Math.floor(height / 145)));
    this.cardHeight = Math.min(height / this.lanes * 0.72, width * 0.46 / CARD_ASPECT_RATIO);
    this.featureHeight = Math.min(height * 0.64, width * 0.82 / CARD_ASPECT_RATIO, 540);
    this.tiles = [];
    this.feature = undefined;
    this.deck = [];
    this.lastLane.clear();
    if (!this.cards.length) return;
    const columns = Math.ceil(width / (this.cardWidth * 1.22)) + 2;
    // Deal across heights, rotating the lane order each column. A pool of 5, 10,
    // etc. cards therefore cannot lock each repeated image to one fixed lane.
    for (let column = 0; column < columns; column++) {
      for (let offset = 0; offset < this.lanes; offset++) {
        const lane = (offset + column) % this.lanes;
        const depth = Math.random();
        this.tiles.push({
          key: `float-${this.sequence++}`,
          card: this.takeCard(lane),
          lane,
          x: (column - 0.6 + (lane % 2) * 0.45) * this.cardWidth * 1.22,
          phase: Math.random() * Math.PI * 2,
          depth,
          speed: 13 + depth * 15 + (lane % 3) * 3,
          tilt: (Math.random() - 0.5) * 7,
        });
      }
    }
  }

  private startFeature(request: Request) {
    const visible = this.tiles.filter((tile) => tile.x > 0 && tile.x < this.width - this.cardWidth);
    const tile = visible.find((tile) => tile.card._id === request.card._id)
      ?? visible[Math.floor(visible.length / 2)] ?? this.tiles[0];
    tile.card = request.card;
    this.feature = { ...request, tile, key: `spotlight-${this.sequence++}`, age: 0 };
  }

  private pose(tile: Floater) {
    const time = this.reducedMotion ? 0 : this.clock;
    const laneHeight = this.height / this.lanes;
    return {
      x: tile.x + Math.sin(time * 0.21 + tile.phase) * this.cardWidth * 0.06,
      y: (tile.lane + 0.5) * laneHeight - this.cardHeight / 2
        + Math.sin(time * 0.43 + tile.phase) * laneHeight * 0.09,
      scale: 0.78 + tile.depth * 0.22,
      rotation: this.reducedMotion ? 0 : tile.tilt + Math.sin(time * 0.32 + tile.phase) * 2,
    };
  }

  private place() {
    for (const tile of this.tiles) {
      const element = this.elements.get(tile.key);
      if (!element) continue;
      const pose = this.pose(tile);
      element.style.transform = `translate3d(${pose.x}px, ${pose.y}px, 0) scale(${pose.scale}) rotate(${pose.rotation}deg)`;
      element.style.opacity = tile === this.feature?.tile ? "0" : String(0.7 + tile.depth * 0.3);
      element.style.zIndex = String(Math.floor(tile.depth * 3));
    }
    const feature = this.feature;
    if (!feature) return;
    const element = this.elements.get(feature.key);
    if (!element) return;
    const pose = this.pose(feature.tile);
    const entering = feature.age < ENTER_MS;
    const closing = feature.age > ENTER_MS + HOLD_MS;
    const progress = this.reducedMotion ? 1 : entering ? ease(feature.age / ENTER_MS)
      : closing ? 1 - ease((feature.age - ENTER_MS - HOLD_MS) / EXIT_MS) : 1;
    const smallScale = this.cardHeight / this.featureHeight * pose.scale;
    const fromX = pose.x + this.cardWidth / 2;
    const fromY = pose.y + this.cardHeight / 2;
    const centerX = fromX + (this.width / 2 - fromX) * progress;
    const centerY = fromY + (this.height * 0.46 - fromY) * progress;
    const scale = smallScale + (1 - smallScale) * progress;
    element.dataset.closing = String(closing);
    element.style.transform = `translate3d(${centerX - this.featureHeight * CARD_ASPECT_RATIO / 2}px, ${centerY - this.featureHeight / 2}px, 0) scale(${scale}) rotate(${pose.rotation * (1 - progress)}deg)`;
  }
}
