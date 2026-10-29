import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 960, height: 600 },
  { width: 1024, height: 768 },
  { width: 1133, height: 744 },
  { width: 1180, height: 820 },
  { width: 1194, height: 834 },
  { width: 1280, height: 800 },
  { width: 1366, height: 1024 },
]) {
  test(`landscape designer fits ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/design");
    await page.getByRole("button", { name: "Let’s start" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    for (const name of ["Restart", "Submit", "Download"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeInViewport({ ratio: 1 });
    }
    const dimensions = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
    }));
    expect(dimensions.height).toBeLessThanOrEqual(viewport.height);
    expect(dimensions.width).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: `artifacts/design-landscape-${viewport.width}x${viewport.height}.png` });
  });
}
