import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Read-only mobile benchmark: never creates or uploads cards.
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, "").split("=");
  return [key, value.join("=")];
}));
const url = args.url ?? "http://localhost:3001/display";
const output = path.resolve(args.output ?? "test-results/wall-mobile");
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    reducedMotion: "no-preference", recordVideo: { dir: output, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();
  if (args["save-data"] === "true") await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", { value: { saveData: true, effectiveType: "2g" }, configurable: true });
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const imageRequests = new Set();
  const receivedBytes = new Map();
  const activeThumbnails = new Set();
  const thumbnailErrors = [];
  let fullSizeImageRequests = 0;
  let peakThumbnailRequests = 0;
  let imageBytes = 0;
  let finishedImages = 0;
  cdp.on("Network.requestWillBeSent", (event) => {
    if (event.request.url.includes(".convex.cloud/api/storage/")) fullSizeImageRequests++;
    if (!event.request.url.includes("/api/wall-thumbnail/")) return;
    activeThumbnails.add(event.requestId);
    peakThumbnailRequests = Math.max(peakThumbnailRequests, activeThumbnails.size);
  });
  cdp.on("Network.responseReceived", (event) => {
    if (event.type === "Image" || event.response.mimeType.startsWith("image/")) imageRequests.add(event.requestId);
    if (event.response.url.includes("/api/wall-thumbnail/") && event.response.status >= 400) thumbnailErrors.push(event.response.status);
  });
  cdp.on("Network.dataReceived", (event) => {
    if (!imageRequests.has(event.requestId)) return;
    receivedBytes.set(event.requestId, (receivedBytes.get(event.requestId) ?? 0) + event.encodedDataLength);
    imageBytes += event.encodedDataLength;
  });
  cdp.on("Network.loadingFinished", (event) => {
    activeThumbnails.delete(event.requestId);
    if (!imageRequests.has(event.requestId)) return;
    imageBytes += Math.max(0, event.encodedDataLength - (receivedBytes.get(event.requestId) ?? 0));
    finishedImages++;
  });
  cdp.on("Network.loadingFailed", (event) => activeThumbnails.delete(event.requestId));
  await page.addInitScript(() => {
    window.wallBenchmark = { frames: [], longTasks: [], firstCardsMs: null };
    const observer = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) window.wallBenchmark.longTasks.push({ start: entry.startTime, duration: entry.duration });
    });
    observer.observe({ type: "longtask", buffered: true });
    let previous;
    requestAnimationFrame(function frame(now) {
      if (window.wallBenchmark.firstCardsMs === null && [...document.querySelectorAll('img[alt="Community Care Day card"]')].some((image) => {
        const box = image.getBoundingClientRect();
        return image.complete && image.naturalWidth && box.right > 0 && box.left < innerWidth && box.bottom > 0 && box.top < innerHeight;
      })) window.wallBenchmark.firstCardsMs = now;
      if (previous !== undefined && window.wallBenchmark.firstCardsMs !== null) window.wallBenchmark.frames.push({ at: now, duration: now - previous });
      previous = now;
      requestAnimationFrame(frame);
    });
  });
  const started = Date.now();
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  const checkpoints = [];
  const captures = [];
  for (const seconds of [1, 3, 8, 15, 30]) {
    await page.waitForTimeout(Math.max(0, seconds * 1000 - (Date.now() - started)));
    const screenshot = path.join(output, `mobile-${String(seconds).padStart(2, "0")}s.png`);
    const captureStart = await page.evaluate(() => performance.now());
    await page.screenshot({ path: screenshot });
    const captureEnd = await page.evaluate(() => performance.now());
    captures.push({ start: captureStart, end: captureEnd });
    checkpoints.push({ seconds, actualElapsedMs: Date.now() - started, imageBytes, finishedImages,
      visibleImages: await page.locator('img[alt="Community Care Day card"]').evaluateAll((images) => images.filter((image) => {
        const box = image.getBoundingClientRect();
        return image.complete && image.naturalWidth && box.right > 0 && box.left < innerWidth && box.bottom > 0 && box.top < innerHeight;
      }).length) });
  }
  const raw = await page.evaluate(() => window.wallBenchmark);
  const frames = raw.frames.filter((frame) => frame.at > raw.firstCardsMs + 1000
    && !captures.some((capture) => frame.at > capture.start - 100 && frame.at < capture.end + 100))
    .map((frame) => frame.duration).sort((a, b) => a - b);
  const percentile = (p) => frames[Math.floor((frames.length - 1) * p)] ?? null;
  const results = {
    url, status: response.status(), conditions: { viewport: "390x844 @2x", network: "1.6Mbps / 150ms RTT", cpuSlowdown: 4, saveData: args["save-data"] === "true" },
    firstCardsMs: raw.firstCardsMs, imageBytes, imageTransferMiB: imageBytes / 1048576, finishedImages,
    peakThumbnailRequests, fullSizeImageRequests, thumbnailErrors, frameSamples: frames.length, medianFrameMs: percentile(0.5), p95FrameMs: percentile(0.95),
    framesOver50Ms: frames.filter((duration) => duration > 50).length, longTasks: raw.longTasks, errors, checkpoints,
    caveat: "Desktop Chromium emulation, not a physical-phone measurement. Screenshot capture can itself disturb frame timing.",
  };
  await writeFile(path.join(output, "metrics.json"), JSON.stringify(results, null, 2));
  await context.close();
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
