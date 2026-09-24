import { toCanvas } from "html-to-image";

const CARD_EXPORT_SIZE = 800;

export const convexSiteUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL?.replace(/\.cloud$/, ".site");

/** WebP where the browser can encode it; canvas.toBlob silently falls back to PNG otherwise. */
export async function renderCardImage(node: HTMLElement): Promise<Blob> {
  const canvas = await toCanvas(node, {
    cacheBust: true,
    pixelRatio: 1,
    canvasWidth: CARD_EXPORT_SIZE,
    canvasHeight: CARD_EXPORT_SIZE,
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not render card"))), "image/webp", 0.9);
  });
}

export async function submitCardImage(image: Blob, idempotencyKey: string) {
  if (!convexSiteUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");

  const response = await fetch(new URL("/cards", convexSiteUrl), {
    method: "POST",
    headers: { "Content-Type": image.type, "Idempotency-Key": idempotencyKey },
    body: image,
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? `Submission failed (${response.status})`);
  }
  return (await response.json()) as { cardId: string };
}
