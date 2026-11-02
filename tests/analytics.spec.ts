import { expect, test } from "@playwright/test";
import { singaporeDay, singaporeTime } from "../lib/analytics";

test("Singapore dates cross midnight at 16:00 UTC without a double offset", () => {
  expect(singaporeDay(Date.parse("2026-11-01T15:59:59Z"))).toBe("2026-11-01");
  expect(singaporeDay(Date.parse("2026-11-01T16:00:00Z"))).toBe("2026-11-02");
  expect(singaporeDay(Date.parse("2026-11-02T00:00:00+08:00"))).toBe("2026-11-02");
  expect(singaporeTime(Date.parse("2026-11-01T17:23:45Z"))).toContain("01:23:45");
});

test("standalone dashboard filters dates in UTC+8 and resets", async ({ page }) => {
  await page.routeWebSocket(/.*convex.*\/api\/.*sync.*/, socket => {
    let version = { querySet: 0, ts: "AAAAAAAAAAA=", identity: 0 };
    let sequence = 0;
    socket.onMessage(raw => {
      const message = JSON.parse(String(raw));
      if (message.type !== "ModifyQuerySet") return;
      const ts = Buffer.alloc(8);
      ts.writeBigUInt64LE(BigInt(++sequence));
      const endVersion = { querySet: message.newVersion, ts: ts.toString("base64"), identity: 0 };
      socket.send(JSON.stringify({ type: "Transition", startVersion: version, endVersion,
        modifications: message.modifications.map((mod: { queryId: number; type: string }) => mod.type === "Remove" ? { type: "QueryRemoved", queryId: mod.queryId } : {
          type: "QueryUpdated", queryId: mod.queryId, logLines: [], journal: null,
          value: { truncated: false, cards: [
            { _id: "card-before", _creationTime: Date.parse("2026-11-01T15:59:59Z"), status: "published", mimeType: "image/webp", byteSize: 2048 },
            { _id: "card-after", _creationTime: Date.parse("2026-11-01T16:00:00Z"), status: "removed", mimeType: "image/png", byteSize: 4096 },
          ] },
        }),
      }));
      version = endVersion;
    });
  });
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Card analytics" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "card-after", exact: true })).toBeVisible();
  await page.getByLabel("From (UTC+8)", { exact: true }).fill("2026-11-02");
  await page.getByLabel("To (UTC+8, inclusive)").fill("2026-11-02");
  await expect(page.getByRole("cell", { name: "card-before", exact: true })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "card-after", exact: true })).toBeVisible();
  await page.getByRole("combobox").filter({ has: page.locator('option[value="published"]') }).selectOption("published");
  await expect(page.getByText("No cards match these filters.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.getByRole("cell", { name: "card-before", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
