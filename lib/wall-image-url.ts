function wallImagePath(source: string, variant: "thumbnail" | "original"): string {
  const url = new URL(source);
  if (url.origin !== new URL(process.env.NEXT_PUBLIC_CONVEX_URL!).origin) throw new Error("Unexpected image origin");
  const id = url.pathname.match(/^\/api\/storage\/([a-f0-9-]{36})$/i)?.[1];
  if (!id) throw new Error("Unexpected image path");
  return `/api/wall-${variant}/${id}`;
}

export const thumbnailPath = (source: string) => wallImagePath(source, "thumbnail");
export const originalImagePath = (source: string) => wallImagePath(source, "original");
