import { expect, test } from "@playwright/test";

test("event mode survives design, home logo, and wall navigation", async ({ page }) => {
  await page.goto("/?event=true");
  await page.getByRole("link", { name: "Create 'Thank You' card" }).click();
  await expect(page).toHaveURL(/\/design\?event=true$/);
  await page.getByRole("button", { name: "Close instructions" }).click();
  await page.getByRole("link", { name: "Community Care Day home" }).click();
  await expect(page).toHaveURL(/\/\?event=true$/);
  await page.getByRole("link", { name: "View the 'Thank You' Wall" }).click();
  await expect(page).toHaveURL(/\/display\?event=true$/);
  await page.getByRole("link", { name: "Community Care Day home" }).click();
  await expect(page).toHaveURL(/\/\?event=true$/);
});

test("normal navigation does not enable event mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Create 'Thank You' card" })).toHaveAttribute("href", "/design");
  await expect(page.getByRole("link", { name: "View the 'Thank You' Wall" })).toHaveAttribute("href", "/display");
});
