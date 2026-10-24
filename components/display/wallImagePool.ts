import type { WallCard } from "./brickWall";

export type ImagePolicy = { initial: number; maximum: number; concurrency: number; batch: number; interval: number };
export type LoadedImage = { url: string; dispose: () => void };
export type ImagePoolSnapshot = { cards: WallCard[]; failed: boolean; loading: boolean };

export function imagePolicy(mobile: boolean, constrained: boolean): ImagePolicy {
  if (constrained) return { initial: 8, maximum: 8, concurrency: 2, batch: 0, interval: 8000 };
  return { initial: mobile ? 16 : 24, maximum: mobile ? 32 : 48, concurrency: 3, batch: 4, interval: 8000 };
}

export function thumbnailPath(source: string): string {
  const url = new URL(source);
  if (url.origin !== new URL(process.env.NEXT_PUBLIC_CONVEX_URL!).origin) throw new Error("Unexpected image origin");
  const id = url.pathname.match(/^\/api\/storage\/([a-f0-9-]{36})$/i)?.[1];
  if (!id) throw new Error("Unexpected image path");
  return `/api/wall-thumbnail/${id}`;
}

/** A bounded, cancellable pool. Only decoded images are ever exposed to the animation. */
export class WallImagePool {
  private sources: WallCard[] = [];
  private limit: number;
  private loaded = new Map<string, { source: string; image: LoadedImage }>();
  private active = new Map<string, AbortController>();
  private attempts = new Map<string, number>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private paused = false;
  private disposed = false;
  private started = false;

  constructor(
    private policy: ImagePolicy,
    private load: (source: string, signal: AbortSignal) => Promise<LoadedImage>,
    private publish: (snapshot: ImagePoolSnapshot) => void,
  ) {
    this.limit = policy.initial;
  }

  update(cards: WallCard[], spotlight?: WallCard) {
    this.clearTimer();
    this.sources = spotlight ? [spotlight, ...cards.filter((card) => card._id !== spotlight._id)] : cards;
    const selected = this.selected();
    const ids = new Set<string>(selected.map((card) => card._id));
    for (const [id, entry] of this.loaded) {
      if (ids.has(id) && selected.some((card) => card._id === id && card.url === entry.source)) continue;
      entry.image.dispose();
      this.loaded.delete(id);
    }
    for (const [id, controller] of this.active) {
      if (!ids.has(id)) controller.abort();
    }
    for (const id of this.attempts.keys()) if (!ids.has(id) && !this.active.has(id)) this.attempts.delete(id);
    this.emit();
    this.pump();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) this.clearTimer();
    else this.pump();
  }

  retry() {
    this.attempts.clear();
    this.pump();
    this.emit();
  }

  dispose() {
    this.disposed = true;
    this.clearTimer();
    for (const controller of this.active.values()) controller.abort();
    for (const entry of this.loaded.values()) entry.image.dispose();
    this.loaded.clear();
  }

  private selected() {
    return this.sources.slice(0, this.limit);
  }

  private clearTimer() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  private emit() {
    if (this.disposed) return;
    const selected = this.selected();
    const cards = selected.flatMap((card) => {
      const entry = this.loaded.get(card._id);
      return entry ? [{ ...card, url: entry.image.url }] : [];
    });
    const failed = selected.some((card) => !this.loaded.has(card._id) && !this.active.has(card._id) && (this.attempts.get(card._id) ?? 0) >= 2);
    // Start with a varied deck, not hundreds of copies of the first image to finish.
    const stillPending = selected.some((card) => !this.loaded.has(card._id) && (this.active.has(card._id) || (this.attempts.get(card._id) ?? 0) < 2));
    if (cards.length >= Math.min(8, selected.length) || (cards.length > 0 && !stillPending)) this.started = true;
    const visibleCards = this.started ? cards : [];
    this.publish({ cards: visibleCards, failed, loading: visibleCards.length === 0 && selected.length > 0 && (!failed || stillPending) });
  }

  private pump() {
    if (this.disposed || this.paused) return;
    const pending = this.selected().filter((card) => !this.loaded.has(card._id)
      && !this.active.has(card._id) && (this.attempts.get(card._id) ?? 0) < 2);
    for (const card of pending) {
      if (this.active.size >= this.policy.concurrency) break;
      this.clearTimer();
      const controller = new AbortController();
      this.active.set(card._id, controller);
      this.attempts.set(card._id, (this.attempts.get(card._id) ?? 0) + 1);
      void this.load(card.url, controller.signal).then((image) => {
        if (this.disposed || controller.signal.aborted || !this.selected().some((item) => item._id === card._id && item.url === card.url)) {
          image.dispose();
        } else {
          this.loaded.set(card._id, { source: card.url, image });
        }
      }).catch(() => {
        if (controller.signal.aborted) this.attempts.delete(card._id);
      }).finally(() => {
        this.active.delete(card._id);
        this.emit();
        this.pump();
      });
    }
    if (!this.active.size && !this.timer && this.policy.batch > 0 && this.limit < Math.min(this.sources.length, this.policy.maximum)) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.limit = Math.min(this.limit + this.policy.batch, this.policy.maximum);
        this.pump();
      }, this.policy.interval);
    }
  }
}
