import { expect, test, type Page } from "@playwright/test";

async function imageStats(page: Page, src: string) {
  return page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let visible = 0;
    let colored = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 128) visible++;
      if (Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 30) colored++;
    }
    return { width: canvas.width, height: canvas.height, visible: visible / (canvas.width * canvas.height), colored };
  }, src);
}

test.beforeEach(async ({ page }) => {
  // Every upload is intercepted locally; the tests never submit real wall cards.
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
  };
  await page.route("**/cards", (route) => route.fulfill({ headers, json: { cardId: "test-card" } }));
  await page.route("**/card-downloads", (route) => route.fulfill({ headers, json: { url: "https://example.com/card.webp" } }));
});

async function openEditor(page: Page, eventMode = false) {
  await page.goto(`/design${eventMode ? "?event=true" : ""}`);
  await page.getByRole("button", { name: /Let.s start/ }).click();
}

test("all six frames produce visible images, including the PNG encoder fallback", async ({ page }) => {
  await openEditor(page);
  // Simulate Safari versions which don't encode WebP, as in the reported PNG.
  await page.evaluate(() => {
    const encode = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback) { encode.call(this, callback, "image/png"); };
  });
  await page.getByRole("tab", { name: "Frames", exact: true }).click();
  for (let frame = 1; frame <= 6; frame++) {
    await page.getByRole("button", { name: `Select frame ${frame}`, exact: true }).click();
    const upload = page.waitForRequest((request) => new URL(request.url()).pathname === "/cards");
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    expect((await upload).headers()["content-type"]).toBe("image/png");
    await expect(page.getByRole("heading", { name: "Card submitted!" })).toBeVisible();
    const preview = page.getByRole("dialog").locator('img[src^="blob:"]');
    const stats = await imageStats(page, (await preview.getAttribute("src"))!);
    expect(stats.width).toBe(800);
    expect(stats.height).toBe(663);
    expect(stats.visible).toBeGreaterThan(0.9);
    expect(stats.colored).toBeGreaterThan(1000);
    await page.getByRole("button", { name: "Close", exact: true }).click();
  }
});

test("export matches the editor with rotated, resized, overlapping stickers", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Add message 1", exact: true }).click();
  const rotate = page.getByRole("button", { name: "Rotate sticker", exact: true });
  const handle = (await rotate.boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + 90, handle.y + 20);
  await page.mouse.up();
  const resize = (await page.getByRole("button", { name: "Resize sticker", exact: true }).boundingBox())!;
  await page.mouse.move(resize.x + resize.width / 2, resize.y + resize.height / 2);
  await page.mouse.down();
  await page.mouse.move(resize.x + 35, resize.y + 40);
  await page.mouse.up();
  await page.getByRole("tab", { name: "CCP Stickers", exact: true }).click();
  await page.getByRole("button", { name: "Add CCP sticker 1", exact: true }).click();
  const board = page.locator('[style*="background-image:"]');
  await board.click({ position: { x: 20, y: 20 } });
  await page.locator('button[aria-label="Move sticker"] img').evaluateAll(async (images) => {
    await Promise.all(images.map((image) => (image as HTMLImageElement).decode()));
  });
  const screenshot = (await board.screenshot()).toString("base64");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Card submitted!" })).toBeVisible();
  const src = (await page.getByRole("dialog").locator('img[src^="blob:"]').getAttribute("src"))!;
  const difference = await page.evaluate(async ({ screenshot, src }) => {
    const pixels = async (src: string) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 663;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 800, 663);
      return ctx.getImageData(0, 0, 800, 663).data;
    };
    const expected = await pixels(`data:image/png;base64,${screenshot}`);
    const actual = await pixels(src);
    let total = 0;
    let samples = 0;
    // Ignore the viewport's decorative corner clipping and subpixel outer edges.
    for (let y = 70; y < 590; y++) for (let x = 80; x < 720; x++) {
      const i = (y * 800 + x) * 4;
      for (let c = 0; c < 3; c++) { total += Math.abs(expected[i + c] - actual[i + c]); samples++; }
    }
    return total / samples;
  }, { screenshot, src });
  expect(difference).toBeLessThan(5);
});

for (const failure of ["missing frame", "missing sticker", "blank canvas", "solid canvas", "failed decode", "failed encoding"] as const) {
  test(`${failure} shows an error without uploading`, async ({ page }) => {
    let uploads = 0;
    page.on("request", (request) => { if (new URL(request.url()).pathname === "/cards") uploads++; });
    await openEditor(page);
    if (failure === "missing frame") {
      await page.route("**/assets/frames/frame_6.webp", (route) => route.abort());
    } else if (failure === "missing sticker") {
      await page.route("**/assets/messages/msg_1.webp", (route) => route.abort());
      await page.getByRole("button", { name: "Add message 1", exact: true }).click();
    } else if (failure === "blank canvas") {
      await page.evaluate(() => { CanvasRenderingContext2D.prototype.drawImage = () => {}; });
    } else if (failure === "solid canvas") {
      await page.evaluate(() => {
        CanvasRenderingContext2D.prototype.drawImage = function () {
          this.fillStyle = "white";
          this.fillRect(0, 0, this.canvas.width, this.canvas.height);
        };
      });
    } else if (failure === "failed decode") {
      await page.evaluate(() => { HTMLImageElement.prototype.decode = () => Promise.reject(new Error("Decode failed")); });
    } else {
      await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = (callback) => callback(null); });
    }
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Submission failed", exact: true })).toBeVisible();
    expect(uploads).toBe(0);
  });
}

test("submission waits for slow artwork to decode", async ({ page }) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Add message 1", exact: true }).click();
  await page.evaluate(() => {
    const decode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return decode.call(this);
    };
  });
  const start = Date.now();
  const upload = page.waitForRequest((request) => new URL(request.url()).pathname === "/cards");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await upload;
  expect(Date.now() - start).toBeGreaterThanOrEqual(350);
  await expect(page.getByRole("heading", { name: "Card submitted!" })).toBeVisible();
});

test("regular PNG download and event QR upload use the validated renderer", async ({ page }) => {
  await page.addInitScript(() => {
    // WebKit doesn't expose Blob POST bytes through Playwright's postDataBuffer.
    // Observe the exact encoded blob before either download/upload consumes it.
    const encode = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      encode.call(this, (blob) => {
        if (blob) document.documentElement.dataset.encodedCard = URL.createObjectURL(blob);
        callback(blob);
      }, type, quality);
    };
  });
  await openEditor(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("community-care-card.png");
  await expect(page.getByRole("heading", { name: "for participating!" })).toBeVisible();
  const downloadSrc = (await page.locator("html").getAttribute("data-encoded-card"))!;
  const downloaded = await imageStats(page, downloadSrc);
  expect(downloaded).toMatchObject({ width: 886, height: 734 });
  expect(downloaded.visible).toBeGreaterThan(0.9);
  await openEditor(page, true);
  const upload = page.waitForRequest((request) => new URL(request.url()).pathname === "/card-downloads");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const request = await upload;
  const type = request.headers()["content-type"];
  expect(["image/webp", "image/png"]).toContain(type);
  const uploadSrc = (await page.locator("html").getAttribute("data-encoded-card"))!;
  const stats = await imageStats(page, uploadSrc);
  expect(stats).toMatchObject({ width: 800, height: 663 });
  expect(stats.visible).toBeGreaterThan(0.9);
  await expect(page.getByRole("heading", { name: /Scan the QR/ })).toBeVisible();
});
