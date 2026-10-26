import sharp from "sharp";
import { readWallImage, WALL_IMAGE_CACHE_CONTROL } from "@/lib/server/wall-image";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ storageId: string }> }) {
  const { storageId } = await params;
  const source = await readWallImage(storageId);
  if (source instanceof Response) return source;

  try {
    const image = sharp(source.bytes, { limitInputPixels: 2_000_000, animated: false });
    const thumbnail = await image.resize({ width: 384, withoutEnlargement: true }).webp({ quality: 65 }).toBuffer();
    return new Response(new Uint8Array(thumbnail), {
      headers: {
        "Content-Type": "image/webp",
        // Storage IDs are immutable. Cache old and new cards without a database migration.
        "Cache-Control": WALL_IMAGE_CACHE_CONTROL,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Image unavailable", { status: 502 });
  }
}
