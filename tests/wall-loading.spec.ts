import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import type { WallCard } from "../components/display/brickWall";

async function mockWall(page: Page, constrained = false, count = 80) {
  if (constrained) await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", { value: { saveData: true, effectiveType: "2g" }, configurable: true });
  });
  const cards: WallCard[] = Array.from({ length: count }, (_, index) => ({
    _id: `card-${index}` as WallCard["_id"], _creationTime: count - index,
    url: `https://wall-test.convex.cloud/api/storage/00000000-0000-0000-0000-${String(index).padStart(12, "0")}`,
  }));
  const requests: string[] = [];
  let active = 0;
  let peak = 0;
  let originalRequests = 0;
  let update = (_cards: WallCard[]) => {};
  await page.route("**/api/storage/**", (route) => { originalRequests++; return route.abort(); });
  const artwork = await sharp(await readFile("public/assets/frames/frame_1.webp")).resize(384).webp({ quality: 65 }).toBuffer();
  await page.route("**/api/wall-thumbnail/**", async (route) => {
    requests.push(route.request().url());
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 80));
    await route.fulfill({ contentType: "image/webp", body: artwork });
    active--;
  });
  await page.routeWebSocket("wss://wall-test.convex.cloud/**", (socket) => {
    let version = { querySet: 0, ts: "AAAAAAAAAAA=", identity: 0 };
    let sequence = 0;
    let listQueryId = 0;
    const send = (querySet: number, modifications: unknown[]) => {
      const ts = Buffer.alloc(8);
      ts.writeBigUInt64LE(BigInt(++sequence));
      const endVersion = { querySet, ts: ts.toString("base64"), identity: 0 };
      socket.send(JSON.stringify({ type: "Transition", startVersion: version, endVersion, modifications }));
      version = endVersion;
    };
    update = (next) => send(version.querySet, [{ type: "QueryUpdated", queryId: listQueryId, value: next, logLines: [], journal: null }]);
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type !== "ModifyQuerySet") return;
      const modifications = message.modifications.map((mod: { type: string; queryId: number; udfPath: string }) => {
        if (mod.type === "Remove") return { type: "QueryRemoved", queryId: mod.queryId };
        if (mod.udfPath === "cards:listPublished") listQueryId = mod.queryId;
        return { type: "QueryUpdated", queryId: mod.queryId, value: mod.udfPath === "cards:listPublished" ? cards : null, logLines: [], journal: null };
      });
      send(message.newVersion, modifications);
    });
  });
  return { cards, requests, update: (next: WallCard[]) => update(next), peak: () => peak, originals: () => originalRequests };
}

test("mobile wall decodes a small initial pool with at most three downloads, then batches", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const wall = await mockWall(page);
  await page.goto("/display");
  const images = page.getByAltText("Community Care Day card", { exact: true });
  await expect(images.first()).toBeVisible();
  await expect.poll(() => wall.requests.length).toBe(16);
  expect(wall.peak()).toBeLessThanOrEqual(3);
  expect(wall.originals()).toBe(0);
  await expect.poll(() => images.evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await expect.poll(() => wall.requests.length, { timeout: 12_000 }).toBe(20);
  expect(errors).toEqual([]);
});

test("Data Saver caps downloads and spotlight is prioritized without a full-size fetch", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const wall = await mockWall(page, true);
  await page.goto("/display?card=card-79");
  await expect(page.getByAltText("Community Care Day card", { exact: true }).first()).toBeVisible();
  await expect.poll(() => wall.requests.length).toBe(8);
  expect(wall.requests[0]).toContain("000000000079");
  expect(wall.peak()).toBeLessThanOrEqual(2);
  expect(wall.originals()).toBe(0);
});

test("moderation removes decoded cards and live arrivals use the same bounded queue", async ({ page }) => {
  const wall = await mockWall(page, true);
  await page.goto("/display");
  const images = page.getByAltText("Community Care Day card", { exact: true });
  await expect(images.first()).toBeVisible();
  wall.update([]);
  await expect(images).toHaveCount(0);
  await expect(page.getByText("Cards will appear here as they are submitted.")).toBeVisible();
  wall.update([wall.cards[40]]);
  await expect(images.first()).toBeVisible();
  expect(wall.requests.at(-1)).toContain("000000000040");
});

test("desktop streams later cards from the right without changing existing on-screen artwork", async ({ page }) => {
  test.setTimeout(70_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const audit = { swaps: 0, seen: [] as string[], badEntries: [] as { id: string; left: number }[], initial: [] as string[] };
    (window as Window & { wallStreamAudit?: typeof audit }).wallStreamAudit = audit;
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type !== "attributes" || record.attributeName !== "data-card-id") continue;
        const element = record.target as HTMLElement;
        const rect = element.getBoundingClientRect();
        if (record.oldValue && record.oldValue !== element.dataset.cardId && rect.right > 0 && rect.left < innerWidth) audit.swaps++;
      }
    }).observe(document, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ["data-card-id"] });
    requestAnimationFrame(function sample() {
      const visible = [...document.querySelectorAll<HTMLElement>("[data-card-id]")].filter((element) => {
        const rect = element.getBoundingClientRect();
        const image = element.querySelector("img");
        return rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight && image?.complete && image.naturalWidth;
      });
      if (!audit.initial.length && visible.length) audit.initial = [...new Set(visible.map((element) => element.dataset.cardId!))];
      for (const element of visible) {
        const id = element.dataset.cardId!;
        if (audit.seen.includes(id)) continue;
        const left = element.getBoundingClientRect().left;
        if (!audit.initial.includes(id) && left < innerWidth - 20) audit.badEntries.push({ id, left });
        audit.seen.push(id);
      }
      requestAnimationFrame(sample);
    });
  });
  const wall = await mockWall(page, false, 34);
  await page.goto("/display");
  await expect.poll(() => wall.requests.length, { timeout: 12_000 }).toBe(34);
  const audit = () => page.evaluate(() => (window as Window & { wallStreamAudit?: { swaps: number; seen: string[]; badEntries: unknown[] } }).wallStreamAudit!);
  await expect.poll(async () => (await audit()).seen.length, { timeout: 55_000 }).toBe(34);
  expect((await audit()).swaps).toBe(0);
  expect((await audit()).badEntries).toEqual([]);
  expect(wall.peak()).toBeLessThanOrEqual(3);
  expect(wall.originals()).toBe(0);
});
