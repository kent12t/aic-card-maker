import { readWallImage, WALL_IMAGE_CACHE_CONTROL } from "@/lib/server/wall-image";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ storageId: string }> }) {
  const { storageId } = await params;
  const source = await readWallImage(storageId);
  if (source instanceof Response) return source;

  // Preserve original resolution and quality; let the CDN serve repeated highlights.
  return new Response(new Uint8Array(source.bytes), {
    headers: {
      "Content-Type": source.contentType,
      "Cache-Control": WALL_IMAGE_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
