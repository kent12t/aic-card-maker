export const convexSiteUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL?.replace(/\.cloud$/, ".site");

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

export async function uploadDownloadImage(image: Blob): Promise<string> {
  if (!convexSiteUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  const response = await fetch(new URL("/card-downloads", convexSiteUrl), {
    method: "POST",
    headers: { "Content-Type": image.type },
    body: image,
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? `Image upload failed (${response.status})`);
  }
  const { url } = (await response.json()) as { url?: string };
  if (!url) throw new Error("Could not create an image link. Please try again.");
  return url;
}
