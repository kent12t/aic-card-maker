import { expect, test } from "@playwright/test";
import { WallImagePool, imagePolicy, type ImagePoolSnapshot, type LoadedImage } from "../components/display/wallImagePool";
import type { WallCard } from "../components/display/brickWall";

function cards(count: number): WallCard[] {
  return Array.from({ length: count }, (_, index) => ({
    _id: `card-${index}` as WallCard["_id"], _creationTime: count - index, url: `https://example.com/${index}`,
  }));
}

test("initial downloads are bounded, decoded before publication, then loaded in small batches", async () => {
  const pending: { resolve: (image: LoadedImage) => void; signal: AbortSignal }[] = [];
  let active = 0;
  let peak = 0;
  let snapshot: ImagePoolSnapshot = { cards: [], failed: false, loading: true };
  const pool = new WallImagePool({ initial: 8, maximum: 12, concurrency: 3, batch: 2, interval: 60_000 },
    (_source, signal) => new Promise<LoadedImage>((resolve) => {
      active++;
      peak = Math.max(peak, active);
      pending.push({ resolve: (image) => { active--; resolve(image); }, signal });
    }), (next) => { snapshot = next; });
  try {
    pool.update(cards(80));
    expect(pending).toHaveLength(3);
    expect(snapshot.cards).toHaveLength(0);
    for (let i = 0; i < 8; i++) {
      pending[i].resolve({ url: `blob:${i}`, dispose: () => {} });
      await new Promise((resolve) => setImmediate(resolve));
      if (i < 7) expect(snapshot.cards).toHaveLength(0);
    }
    expect(snapshot.cards).toHaveLength(8);
    expect(pending).toHaveLength(8);
    expect(peak).toBe(3);
  } finally { pool.dispose(); }
});

test("constrained connections do not fetch the rest of the subscription", async () => {
  let requests = 0;
  const policy = imagePolicy(true, true);
  const pool = new WallImagePool({ ...policy, interval: 5 }, async () => {
    requests++;
    return { url: "blob:test", dispose: () => {} };
  }, () => {});
  try {
    pool.update(cards(80));
    await expect.poll(() => requests).toBe(8);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(requests).toBe(8);
  } finally { pool.dispose(); }
});

test("background batches respect the lifetime budget and pause while hidden", async () => {
  let requests = 0;
  const pool = new WallImagePool({ initial: 8, maximum: 12, concurrency: 3, batch: 2, interval: 10 }, async () => {
    requests++;
    return { url: "blob:test", dispose: () => {} };
  }, () => {});
  try {
    pool.setPaused(true);
    pool.update(cards(80));
    expect(requests).toBe(0);
    pool.setPaused(false);
    await expect.poll(() => requests).toBe(12);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(requests).toBe(12);
  } finally { pool.dispose(); }
});

test("moderated cards are removed immediately and cached blobs are released", async () => {
  let disposed = 0;
  let snapshot: ImagePoolSnapshot = { cards: [], failed: false, loading: true };
  const source = cards(8);
  const pool = new WallImagePool(imagePolicy(true, true), async () => ({ url: "blob:test", dispose: () => { disposed++; } }),
    (next) => { snapshot = next; });
  pool.update(source);
  await expect.poll(() => snapshot.cards.length).toBe(8);
  pool.update(source.slice(1));
  expect(snapshot.cards).toHaveLength(7);
  expect(disposed).toBe(1);
  pool.dispose();
  expect(disposed).toBe(8);
});

test("spotlight has download priority, failures are bounded and can be retried", async () => {
  const source = cards(80);
  const requests: string[] = [];
  let fail = true;
  let snapshot: ImagePoolSnapshot = { cards: [], failed: false, loading: true };
  const pool = new WallImagePool(imagePolicy(true, true), async (url) => {
    requests.push(url);
    if (fail) throw new Error("offline");
    return { url: "blob:test", dispose: () => {} };
  }, (next) => { snapshot = next; });
  try {
    pool.update(source, source[79]);
    await expect.poll(() => requests.length).toBe(16);
    expect(requests[0]).toBe(source[79].url);
    expect(snapshot.failed).toBe(true);
    fail = false;
    pool.retry();
    await expect.poll(() => snapshot.cards.length).toBe(8);
    expect(snapshot.cards[0]._id).toBe(source[79]._id);
  } finally { pool.dispose(); }
});

test("unmount aborts outstanding requests", () => {
  const signals: AbortSignal[] = [];
  const pool = new WallImagePool(imagePolicy(true, false), (_source, signal) => {
    signals.push(signal);
    return new Promise(() => {});
  }, () => {});
  pool.update(cards(80));
  pool.dispose();
  expect(signals).toHaveLength(3);
  expect(signals.every((signal) => signal.aborted)).toBe(true);
});
