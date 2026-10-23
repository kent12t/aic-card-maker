import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1101, height: 600 },
  { width: 1280, height: 550 },
  { width: 1366, height: 600 },
  { width: 1440, height: 700 },
  { width: 1536, height: 730 },
  { width: 1920, height: 650 },
  { width: 1920, height: 1080 },
]) {
  test(`desktop homepage fits ${viewport.width}×${viewport.height} without scrolling`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const controls = [
      page.getByRole("banner"),
      page.getByRole("heading", { level: 1 }),
      page.getByRole("list", { name: "Three simple steps" }),
      page.getByRole("link", { name: "Create 'Thank You' card", exact: true }),
      page.getByRole("link", { name: "View the 'Thank You' Wall", exact: true }),
    ];
    for (const control of controls) {
      await expect(control).toBeInViewport({ ratio: 1 });
    }

    const dimensions = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
    }));
    expect(dimensions.height).toBeLessThanOrEqual(viewport.height);
    expect(dimensions.width).toBeLessThanOrEqual(viewport.width);
  });
}

test("short desktop viewport contains the animated deck and pause control", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 600 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("button", { name: /pause/i })).toBeInViewport({ ratio: 1 });

  for (const time of [0, 3540, 4000, 7540, 8000, 11540]) {
    const bounds = await page.evaluate((time) => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = time;
      }
      return [...document.querySelectorAll('main img[src*="card_kv"]')].map((image) => {
        const rect = image.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      });
    }, time);
    expect(bounds).toHaveLength(3);
    for (const card of bounds) {
      expect(card.top).toBeGreaterThanOrEqual(0);
      expect(card.bottom).toBeLessThanOrEqual(600);
    }
  }
});
