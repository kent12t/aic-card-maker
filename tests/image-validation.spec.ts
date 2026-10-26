import { expect, test } from "@playwright/test";
import { validateCardImage } from "../convex/lib/image";

for (const mimeType of ["image/png", "image/webp"] as const) {
  for (const [width, height, accepted] of [
    [400, 331, true], // Older smaller wall submissions.
    [800, 663, true], // Event QR downloads and clients opened before deployment.
    [400, 663, false],
    [800, 331, false],
    [886, 734, false], // Local-only PNG downloads are not upload sizes.
  ] as const) {
    test(`${mimeType} upload validation ${accepted ? "accepts" : "rejects"} ${width}x${height}`, async ({ page }) => {
      const bytes = await page.evaluate(async ({ width, height, mimeType }) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#fdca22";
        context.fillRect(0, 0, width, height);
        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), mimeType));
        return [...new Uint8Array(await blob.arrayBuffer())];
      }, { width, height, mimeType });

      const result = validateCardImage(new Uint8Array(bytes));
      if (accepted) expect(result).toMatchObject({ width, height });
      else expect(typeof result).toBe("string");
    });
  }
}
