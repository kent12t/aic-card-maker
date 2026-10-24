import { expect, test } from "@playwright/test";
import { BrickWall, type WallCard } from "../components/display/brickWall";
import { settleWall, type WallParticle } from "../components/display/wallPhysics";

function particle(anchorX: number, anchorY: number, halfWidth = 30, halfHeight = 25, mass = 1): WallParticle {
  return { anchorX, anchorY, halfWidth, halfHeight, mass, body: { x: 0, y: 0, vx: 0, vy: 0 } };
}

test("overlapping cards separate gently and heavier cards move less", () => {
  const small = particle(0, 0, 20, 30, 1);
  const large = particle(45, 0, 40, 30, 3);
  settleWall([small, large], 0.12, 5);
  expect(small.body.x).toBeLessThan(0);
  expect(large.body.x).toBeGreaterThan(0);
  expect(Math.abs(small.body.x)).toBeGreaterThan(Math.abs(large.body.x));

  settleWall([small, large], 5, 5);
  const separation = large.anchorX + large.body.x - small.anchorX - small.body.x;
  expect(separation).toBeGreaterThan(62);
  expect(Math.abs(small.body.vx)).toBeLessThan(0.1);
  expect(Math.abs(large.body.vx)).toBeLessThan(0.1);
});

test("cross-row neighbors separate vertically and settle consistently across frame rates", () => {
  const run = (fps: number) => {
    const cards = [particle(0, 0, 50, 35), particle(10, 50, 50, 35)];
    for (let i = 0; i < fps * 3; i++) settleWall(cards, 1 / fps, 4);
    return cards;
  };
  const slow = run(30);
  const fast = run(120);
  expect(slow[0].body.y).toBeLessThan(-9);
  expect(slow[1].body.y).toBeGreaterThan(9);
  expect(Math.abs(slow[0].body.y - fast[0].body.y)).toBeLessThan(0.01);
  expect(Math.abs(slow[1].body.y - fast[1].body.y)).toBeLessThan(0.01);
  const frozen = { ...slow[0].body };
  settleWall(slow, 0, 4);
  expect(slow[0].body).toEqual(frozen);
});

test("spring forces cannot push a card through the vertical boundaries", () => {
  const top = { ...particle(0, 30, 50, 30), minY: 30, maxY: 170 };
  const middle = particle(0, 65, 50, 30);
  const bottom = { ...particle(0, 170, 50, 30), minY: 30, maxY: 170 };
  const lower = particle(0, 135, 50, 30);
  for (let i = 0; i < 120; i++) {
    settleWall([top, middle, lower, bottom], 1 / 60, 6);
    expect(top.anchorY + top.body.y).toBeGreaterThanOrEqual(top.minY);
    expect(bottom.anchorY + bottom.body.y).toBeLessThanOrEqual(bottom.maxY);
  }
});

test("size-aware wall remains finite through arrivals, rejoining, wrapping and resizing", () => {
  const elements = new Map<string, HTMLElement>();
  const wall = new BrickWall(elements);
  const card = (id: string): WallCard => ({ _id: id as WallCard["_id"], _creationTime: 1, url: `/test-${id}.webp` });
  let cards = [card("one"), card("two"), card("three")];
  const tick = (width = 390, height = 720, replay?: string, reduced = false) => {
    const changed = wall.tick(100, cards, width, height, replay, reduced);
    const snapshot = wall.snapshot();
    if (changed) {
      const keys = new Set([...snapshot.bricks, ...snapshot.features].map(({ key }) => key));
      for (const key of elements.keys()) if (!keys.has(key)) elements.delete(key);
      for (const key of keys) if (!elements.has(key)) elements.set(key, { style: {} } as HTMLElement);
    }
    expect([...elements.values()].some((element) => /NaN|Infinity/.test(element.style.transform))).toBe(false);
    const clipped: string[] = [];
    const checkBounds = (key: string, boxWidth: number, boxHeight: number, padding: number) => {
      const transform = elements.get(key)?.style.transform;
      if (!transform || transform.startsWith("translate3d(-9999px")) return;
      const match = transform.match(/translate3d\([-.\d]+px, ([-.\d]+)px, 0\) rotate\(([-.\d]+)deg\) scale\(([-.\d]+)\)/)!;
      const centerY = Number(match[1]) + boxHeight / 2;
      const angle = Number(match[2]) * Math.PI / 180;
      const scale = Number(match[3]);
      const radius = (Math.abs(Math.sin(angle)) * (boxWidth - padding * 2)
        + Math.abs(Math.cos(angle)) * (boxHeight - padding * 2)) * scale / 2;
      if (centerY - radius < 12 - 0.001 || centerY + radius > height - 12 + 0.001) clipped.push(key);
    };
    for (const { key } of snapshot.bricks) checkBounds(key, snapshot.cellWidth, snapshot.cell, 4);
    for (const { key } of snapshot.features) checkBounds(key, snapshot.bigWidth, snapshot.bigSize, 0);
    expect(clipped, "rotated artwork must retain top and bottom clearance").toEqual([]);
  };
  tick();
  tick();
  const initial = wall.snapshot();
  const depths = initial.bricks.map(({ depth }) => depth);
  expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(0.8);
  // Size-aware slots change horizontal spacing, rather than just scaling cards in a fixed grid.
  const transforms = initial.bricks.slice(0, 8).map(({ key }) => elements.get(key)!.style.transform);
  const xs = transforms.map((value) => Number(value.match(/translate3d\(([-.\d]+)px/)![1]));
  const steps = xs.slice(1).map((x, i) => x - xs[i]);
  expect(Math.max(...steps) - Math.min(...steps)).toBeGreaterThan(initial.cellWidth * 0.1);

  cards = [card("new"), ...cards];
  tick();
  expect(wall.snapshot().features).toHaveLength(1);
  for (let i = 0; i < 1000; i++) tick();
  expect(wall.snapshot().features).toHaveLength(0);
  tick(1440, 900, "one");
  expect(wall.snapshot().features).toHaveLength(1);
  for (let i = 0; i < 80; i++) tick(1440, 900, "one");
  expect(wall.snapshot().features).toHaveLength(0);

  tick(390, 720, undefined, true);
  tick(390, 720, undefined, true);
  const staticTransforms = [...elements.values()].map((element) => element.style.transform);
  for (let i = 0; i < 10; i++) tick(390, 720, undefined, true);
  expect([...elements.values()].map((element) => element.style.transform)).toEqual(staticTransforms);
});

test("wall snapshot mounts only cards near the viewport", () => {
  const wall = new BrickWall(new Map());
  const cards = Array.from({ length: 80 }, (_, index): WallCard => ({
    _id: `card-${index}` as WallCard["_id"],
    _creationTime: index,
    url: `/card-${index}.webp`,
  }));

  wall.tick(16, cards, 390, 720);

  expect(wall.snapshot().bricks.length).toBeLessThan(cards.length);
  expect(wall.snapshot().bricks.length).toBeGreaterThan(0);
});

test("background thumbnail batches do not animate as new submissions", () => {
  const wall = new BrickWall(new Map());
  const card = (id: string): WallCard => ({ _id: id as WallCard["_id"], _creationTime: 1, url: `/test-${id}.webp` });
  const first = card("first");
  const historical = card("historical");
  const arrival = card("arrival");
  wall.tick(16, [first], 390, 720, undefined, false, new Set());
  wall.tick(16, [historical, first], 390, 720, undefined, false, new Set());
  expect(wall.snapshot().features).toHaveLength(0);
  wall.tick(16, [arrival, historical, first], 390, 720, undefined, false, new Set([arrival._id]));
  expect(wall.snapshot().features).toHaveLength(1);
});

test("later downloads keep existing artwork and positions unchanged, then enter from the right", () => {
  const elements = new Map<string, HTMLElement>();
  const wall = new BrickWall(elements);
  const cards = Array.from({ length: 34 }, (_, i): WallCard => ({
    _id: `card-${i}` as WallCard["_id"], _creationTime: i, url: `/card-${i}.webp`,
  }));
  const reconcile = () => {
    for (const brick of wall.snapshot().bricks) if (!elements.has(brick.key)) elements.set(brick.key, { style: {} } as HTMLElement);
  };
  let decoded = cards.slice(0, 8);
  wall.tick(0, decoded, 1920, 1000, undefined, false, new Set());
  reconcile();
  wall.tick(0, decoded, 1920, 1000, undefined, false, new Set());
  const before = wall.snapshot();
  const transforms = new Map([...elements].map(([key, element]) => [key, element.style.transform]));
  decoded = cards;
  wall.tick(0, decoded, 1920, 1000, undefined, false, new Set());
  const after = new Map(wall.snapshot().bricks.map((brick) => [brick.key, brick]));
  for (const brick of before.bricks) {
    if (!after.has(brick.key)) continue;
    expect(after.get(brick.key)?.cardId).toBe(brick.cardId);
    expect(elements.get(brick.key)?.style.transform).toBe(transforms.get(brick.key));
  }

  const identities = new Map<string, string>();
  const seen = new Set(cards.slice(0, 8).map((card) => String(card._id)));
  for (let frame = 0; frame < 700; frame++) {
    reconcile();
    wall.tick(100, decoded, 1920, 1000, undefined, false, new Set());
    const snapshot = wall.snapshot();
    expect(snapshot.features).toHaveLength(0);
    for (const brick of snapshot.bricks) {
      if (identities.has(brick.key)) expect(brick.cardId).toBe(identities.get(brick.key));
      identities.set(brick.key, brick.cardId);
      const transform = elements.get(brick.key)?.style.transform;
      const match = transform?.match(/translate3d\(([-.\d]+)px, [-.\d]+px, 0\) rotate\(([-.\d]+)deg\) scale\(([-.\d]+)\)/);
      if (!match) continue;
      const angle = Number(match[2]) * Math.PI / 180;
      const half = (Math.abs(Math.cos(angle)) * snapshot.cellWidth + Math.abs(Math.sin(angle)) * snapshot.cell) * Number(match[3]) / 2;
      const center = Number(match[1]) + snapshot.cellWidth / 2;
      const left = center - half;
      if (left >= 1920 || center + half <= 0 || seen.has(brick.cardId)) continue;
      expect(left, "a newly decoded card must first appear at the right edge").toBeGreaterThan(1900);
      seen.add(brick.cardId);
    }
  }
  expect(seen.size).toBe(34);
  expect(identities.size).toBeLessThan(800);
});

test("the latest 100 decoded cards all get a turn in the right-edge stream", () => {
  const elements = new Map<string, HTMLElement>();
  const wall = new BrickWall(elements);
  const cards = Array.from({ length: 100 }, (_, i): WallCard => ({
    _id: `card-${i}` as WallCard["_id"], _creationTime: i, url: `/card-${i}.webp`,
  }));
  const initial = cards.slice(0, 8);
  wall.tick(0, initial, 1920, 1000, undefined, false, new Set());
  const seen = new Set<string>();
  for (let frame = 0; frame < 1400; frame++) {
    for (const brick of wall.snapshot().bricks) if (!elements.has(brick.key)) elements.set(brick.key, { style: {} } as HTMLElement);
    wall.tick(100, cards, 1920, 1000, undefined, false, new Set());
    for (const brick of wall.snapshot().bricks) {
      const match = elements.get(brick.key)?.style.transform?.match(/translate3d\(([-.\d]+)px/);
      if (match && Number(match[1]) > 0 && Number(match[1]) < 1920 - wall.snapshot().cellWidth) seen.add(brick.cardId);
    }
    if (seen.size === 100) break;
  }
  expect(seen.size).toBe(100);
});

test("large cards keep bobbing after the spacing physics settles", () => {
  const random = Math.random;
  let seed = 108;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  try {
    const elements = new Map<string, HTMLElement>();
    const wall = new BrickWall(elements);
    const cards: WallCard[] = [{ _id: "card" as WallCard["_id"], _creationTime: 1, url: "/card.webp" }];
    wall.tick(0, cards, 1920, 800);
    const snapshot = wall.snapshot();
    for (const { key } of snapshot.bricks) elements.set(key, { style: {} } as HTMLElement);
    const position = (key: string) => {
      const transform = elements.get(key)!.style.transform;
      const match = transform.match(/translate3d\(([-.\d]+)px, ([-.\d]+)(?:px)?/)!;
      return { x: Number(match[1]), y: Number(match[2]) };
    };
    for (let i = 0; i < 100; i++) wall.tick(100, cards, 1920, 800);
    const largeCards = snapshot.bricks.filter(({ depth, key }) => {
      const { x } = position(key);
      return depth > 0.9 && x > 950 && x < 1750;
    });
    expect(largeCards.length).toBeGreaterThanOrEqual(2);
    const ranges = largeCards.map(({ key }) => ({ key, min: Infinity, max: -Infinity }));
    for (let i = 0; i < 200; i++) {
      wall.tick(100, cards, 1920, 800);
      for (const range of ranges) {
        const { y } = position(range.key);
        range.min = Math.min(range.min, y);
        range.max = Math.max(range.max, y);
      }
    }
    for (const range of ranges) expect(range.max - range.min).toBeGreaterThan(snapshot.cell * 0.1);
    // The artwork occupies only part of each lane, leaving a vertical breathing margin.
    expect(snapshot.cell).toBeLessThan(800 / 8 * 0.8);
  } finally {
    Math.random = random;
  }
});
