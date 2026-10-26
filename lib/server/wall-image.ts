import sharp from "sharp";

const STORAGE_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX_BYTES = 2 * 1024 * 1024;
export const WALL_IMAGE_CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

/** Both image variants share the cached upstream bytes, not just their CDN responses. */
export async function readWallImage(storageId: string): Promise<{ bytes: Buffer; contentType: string } | Response> {
  if (!STORAGE_ID.test(storageId)) return new Response("Invalid image ID", { status: 400 });
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return new Response("Image service unavailable", { status: 503 });

  try {
    // Storage IDs are immutable. Never proxy an arbitrary host or path.
    const upstream = await fetch(new URL(`/api/storage/${storageId}`, convexUrl), {
      signal: AbortSignal.timeout(10_000),
      cache: "force-cache",
      next: { revalidate: 604800 },
    });
    if (!upstream.ok) return new Response("Image unavailable", { status: upstream.status === 404 ? 404 : 502 });
    if (Number(upstream.headers.get("content-length")) > MAX_BYTES) {
      await upstream.body?.cancel();
      return new Response("Image too large", { status: 413 });
    }
    const reader = upstream.body?.getReader();
    if (!reader) return new Response("Image unavailable", { status: 502 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return new Response("Image too large", { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const metadata = await sharp(bytes, { limitInputPixels: 2_000_000, animated: false }).metadata();
    if (metadata.format !== "png" && metadata.format !== "webp") {
      return new Response("Unsupported image", { status: 415 });
    }
    return { bytes, contentType: metadata.format === "png" ? "image/png" : "image/webp" };
  } catch {
    return new Response("Image unavailable", { status: 502 });
  }
}
