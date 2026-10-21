const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Compile the actual engine in memory; no build artifacts or extra test runtime.
function load(sourcePath, imports = {}) {
  const fileName = path.join(__dirname, "..", sourcePath);
  const { outputText } = ts.transpileModule(ts.sys.readFile(fileName), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName,
  });
  const exports = {};
  let seed = 17;
  const math = Object.create(Math);
  math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  vm.runInNewContext(outputText, {
    exports,
    Math: math,
    require: (name) => {
      assert.ok(name in imports, `Unexpected runtime import: ${name}`);
      return imports[name];
    },
  }, { filename: fileName });
  return exports;
}

const constants = load("lib/card-maker/constants.ts");
const { FloatingWall } = load("components/display/floatingWall.ts", { "@/lib/card-maker/constants": constants });
const cards = (count) => Array.from({ length: count }, (_, i) => ({ _id: `card-${i}`, _creationTime: i, url: `/${i}.webp` }));

function gallery(source, width = 1440, height = 850) {
  const elements = new Map();
  const wall = new FloatingWall(elements);
  function tick(dt = 0, next = source, replay, reduced = false) {
    wall.tick(dt, next, width, height, replay, reduced);
    const snapshot = wall.snapshot();
    const keys = new Set([...snapshot.cards, ...snapshot.features].map(({ key }) => key));
    for (const key of elements.keys()) if (!keys.has(key)) elements.delete(key);
    for (const key of keys) if (!elements.has(key)) elements.set(key, { style: {}, dataset: {} });
    wall.tick(0, next, width, height, replay, reduced);
    return wall.snapshot();
  }
  return { wall, elements, tick };
}

test("duplicated artwork spans multiple heights, including pool sizes divisible by the band count", () => {
  for (const [width, height] of [[1440, 850], [390, 650], [1920, 1080]]) {
    for (const count of [1, 2, 5, 6, 10, 12, 30]) {
      const view = gallery(cards(count), width, height);
      const snapshot = view.tick();
      const heights = new Map();
      for (const card of snapshot.cards) {
        const transform = view.elements.get(card.key).style.transform;
        const y = Number(transform.match(/translate3d\([^,]+, ([\d.-]+)px/)[1]);
        const band = Math.floor((y + snapshot.cardHeight / 2) / (height / Math.max(2, Math.min(6, Math.floor(height / 145)))));
        const bands = heights.get(card.url) ?? [];
        bands.push(band);
        heights.set(card.url, bands);
      }
      for (const [url, bands] of heights) {
        if (bands.length > 1) assert.ok(new Set(bands).size > 1, `${width}px, pool ${count}: ${url} stuck in one band`);
      }
    }
  }
});

test("live arrivals queue one at a time and moderator removals clear the spotlight and tiles", () => {
  const original = cards(3);
  const view = gallery(original);
  view.tick();
  const updated = cards(5);
  let snapshot = view.tick(16, updated);
  assert.equal(snapshot.features.length, 1);
  assert.equal(snapshot.features[0].celebrate, true);
  const firstUrl = snapshot.features[0].url;
  for (let i = 0; i < 72; i++) snapshot = view.tick(100, updated);
  assert.equal(snapshot.features.length, 1);
  assert.notEqual(snapshot.features[0].url, firstUrl);
  snapshot = view.tick(0, original);
  assert.equal(snapshot.features.length, 0);
  assert.ok(snapshot.cards.every((tile) => original.some((card) => card.url === tile.url)));
  snapshot = view.tick(0, []);
  assert.equal(snapshot.cards.length, 0);
  assert.equal(snapshot.features.length, 0);
});

test("reduced motion freezes the gallery and disables automatic spotlights", () => {
  const source = cards(5);
  const view = gallery(source);
  const first = view.tick(0, source, undefined, true);
  const before = first.cards.map(({ key }) => view.elements.get(key).style.transform);
  for (let i = 0; i < 300; i++) view.tick(100, source, undefined, true);
  const after = view.wall.snapshot();
  assert.deepEqual(after.cards.map(({ key }) => view.elements.get(key).style.transform), before);
  assert.equal(after.features.length, 0);
});

test("personal replay fits a phone and runs once; the floating collection stays bounded", () => {
  const source = cards(200);
  const view = gallery(source, 390, 650);
  const initial = view.tick(0, source, source[0]._id);
  assert.equal(initial.features.length, 1);
  assert.ok(initial.featureWidth <= 390 * 0.82 + 0.001);
  const size = initial.cards.length;
  const seen = new Set(initial.cards.map(({ url }) => url));
  for (let i = 0; i < 9000; i++) {
    const snapshot = view.tick(100, source, source[0]._id);
    assert.equal(snapshot.cards.length, size);
    for (const tile of snapshot.cards) {
      seen.add(tile.url);
      assert.ok(!/NaN|Infinity/.test(view.elements.get(tile.key).style.transform));
    }
    if (i === 75) assert.equal(snapshot.features.length, 0);
  }
  assert.equal(seen.size, source.length);
});
