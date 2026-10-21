import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CARD_EXPORT_HEIGHT,
  CARD_EXPORT_WIDTH,
} from "./constants";
import type { StickerItem } from "./types";

type CardArtwork = { frame: string; stickers: readonly StickerItem[] };
type RenderOptions = { width?: number; height?: number; mimeType?: "image/png" | "image/webp" };

function loadArtwork(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const fail = () => {
      cleanup();
      reject(new Error("Could not load your card artwork. Please check your connection and try again."));
    };
    const timeout = window.setTimeout(fail, 20_000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
    };
    image.crossOrigin = "anonymous";
    image.onload = async () => {
      try {
        // Loading alone isn't enough on every browser: wait for decoded pixels.
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight) return fail();
        cleanup();
        resolve(image);
      } catch {
        fail();
      }
    };
    image.onerror = fail;
    image.src = src;
  });
}

function assertRenderedArtwork(context: CanvasRenderingContext2D, width: number, height: number) {
  const { data } = context.getImageData(0, 0, width, height);
  let visible = 0;
  let first = -1;
  let varied = false;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    visible += 1;
    if (first === -1) first = i;
    else if (
      Math.abs(data[i] - data[first]) > 8 ||
      Math.abs(data[i + 1] - data[first + 1]) > 8 ||
      Math.abs(data[i + 2] - data[first + 2]) > 8
    ) varied = true;
  }
  // Every approved frame covers nearly the whole card, with varied artwork.
  // Preserve transparent rounded corners, but never upload an empty/solid canvas.
  if (visible < width * height * 0.5 || !varied) {
    throw new Error("Your card image did not render correctly. Please try again.");
  }
}

/** Draw the editor's artwork directly; SVG foreignObject captures can be blank in WebKit. */
export async function renderCardImage(
  { frame, stickers }: CardArtwork,
  { width = CARD_EXPORT_WIDTH, height = CARD_EXPORT_HEIGHT, mimeType = "image/webp" }: RenderOptions = {},
): Promise<Blob> {
  // Load every asset before drawing, including stickers not yet loaded in the editor.
  const sources = [...new Set([frame, ...stickers.map((sticker) => sticker.src)])];
  const images = new Map(await Promise.all(sources.map(async (src) => [src, await loadArtwork(src)] as const)));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create your card image. Please try again.");

  context.drawImage(images.get(frame)!, 0, 0, width, height);
  assertRenderedArtwork(context, width, height);
  context.save();
  context.scale(width / BOARD_WIDTH, height / BOARD_HEIGHT);
  for (const sticker of [...stickers].sort((a, b) => a.zIndex - b.zIndex)) {
    const image = images.get(sticker.src)!;
    // Match CSS object-fit: contain and transforms about the sticker box's center.
    const fit = Math.min(sticker.width / image.naturalWidth, sticker.height / image.naturalHeight);
    const drawWidth = image.naturalWidth * fit;
    const drawHeight = image.naturalHeight * fit;
    context.save();
    context.translate(sticker.x + sticker.width / 2, sticker.y + sticker.height / 2);
    context.rotate(sticker.rotation * Math.PI / 180);
    context.scale(sticker.scale, sticker.scale);
    context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    context.restore();
  }
  context.restore();
  assertRenderedArtwork(context, width, height);

  // Browsers without a WebP encoder return PNG, which the upload endpoint accepts.
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob?.size) resolve(blob);
      else reject(new Error("Could not encode your card image. Please try again."));
    }, mimeType, 0.9);
  });
}
