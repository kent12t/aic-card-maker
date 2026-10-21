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
