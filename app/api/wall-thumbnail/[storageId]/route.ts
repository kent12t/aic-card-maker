import sharp from "sharp";

export const runtime = "nodejs";
const STORAGE_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX_BYTES = 2 * 1024 * 1024;

export async function GET(_request: Request, { params }: { params: Promise<{ storageId: string }> }) {
  const { storageId } = await params;
  if (!STORAGE_ID.test(storageId)) return new Response("Invalid image ID", { status: 400 });
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return new Response("Image service unavailable", { status: 503 });

  try {
    // Only this deployment's public storage is reachable; never accept an arbitrary upstream URL.
    const upstream = await fetch(new URL(`/api/storage/${storageId}`, convexUrl), {
      signal: AbortSignal.timeout(10_000),
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
    const image = sharp(Buffer.concat(chunks), { limitInputPixels: 2_000_000, animated: false });
    const metadata = await image.metadata();
    if (metadata.format !== "png" && metadata.format !== "webp") {
      return new Response("Unsupported image", { status: 415 });
    }
    const thumbnail = await image.resize({ width: 384, withoutEnlargement: true }).webp({ quality: 65 }).toBuffer();
    return new Response(new Uint8Array(thumbnail), {
      headers: {
        "Content-Type": "image/webp",
        // Storage IDs are immutable. Cache old and new cards without a database migration.
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Image unavailable", { status: 502 });
  }
}
