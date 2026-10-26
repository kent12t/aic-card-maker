import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { GET } from "../app/api/wall-thumbnail/[storageId]/route";

const storageId = "00000000-0000-0000-0000-000000000001";
const request = new Request("http://localhost/api/wall-thumbnail/test");

test("thumbnail endpoint resizes legacy images, preserves alpha, and supplies cache headers", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const source = await sharp({ create: { width: 800, height: 663, channels: 4, background: "#ffca2280" } }).png().toBuffer();
  let requested = "";
  let options: RequestInit = {};
  globalThis.fetch = async (url, init) => {
    requested = String(url);
    options = init ?? {};
    return new Response(new Uint8Array(source), { headers: { "content-type": "image/png" } });
  };
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://wall-test.convex.cloud";
  try {
    const response = await GET(request, { params: Promise.resolve({ storageId }) });
    expect(response.status).toBe(200);
    expect(requested).toBe(`https://wall-test.convex.cloud/api/storage/${storageId}`);
    expect(options).toMatchObject({ cache: "force-cache", next: { revalidate: 604800 } });
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("cache-control")).toContain("s-maxage=604800");
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect(metadata).toMatchObject({ width: 384, height: 318, format: "webp", hasAlpha: true });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_CONVEX_URL;
    else process.env.NEXT_PUBLIC_CONVEX_URL = originalUrl;
  }
});

test("thumbnail endpoint rejects arbitrary URLs and oversized streamed bodies", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response(new Uint8Array(2 * 1024 * 1024 + 1));
  };
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://wall-test.convex.cloud";
  try {
    const invalid = await GET(request, { params: Promise.resolve({ storageId: "https://example.com/image" }) });
    expect(invalid.status).toBe(400);
    expect(requests).toBe(0);
    const oversized = await GET(request, { params: Promise.resolve({ storageId }) });
    expect(oversized.status).toBe(413);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_CONVEX_URL;
    else process.env.NEXT_PUBLIC_CONVEX_URL = originalUrl;
  }
});
