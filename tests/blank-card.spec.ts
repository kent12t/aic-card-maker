import { expect, test } from "@playwright/test";

for (const path of ["/design", "/design?event=true"]) {
  test(`blocks blank cards regardless of frame on ${path}`, async ({ page }) => {
    let uploads = 0;
    await page.route("**/cards", async (route) => {
      uploads += 1;
      await route.abort();
    });
    await page.goto(path);
    await page.getByRole("button", { name: "Let’s start" }).click();

    const submit = page.getByRole("button", { name: "Submit", exact: true });
    const blankNotice = page.getByRole("heading", { name: "Your card is still blank" });
    const close = page.getByRole("button", { name: "Close", exact: true });

    await submit.click();
    await expect(blankNotice).toBeVisible();
    await close.click();

    await page.getByRole("button", { name: "Select frame 1", exact: true }).click();
    await submit.click();
    await expect(blankNotice).toBeVisible();
    await close.click();

    await page.getByRole("tab", { name: "Messages", exact: true }).click();
    await page.getByRole("button", { name: "Add message 1", exact: true }).click();
    await page.getByRole("button", { name: "Delete sticker" }).click();
    await submit.click();
    await expect(blankNotice).toBeVisible();
    expect(uploads).toBe(0);
  });
}
