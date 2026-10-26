import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { GET } from "../app/api/wall-original/[storageId]/route";

const storageId = "00000000-0000-0000-0000-000000000001";
const request = new Request("http://localhost/api/wall-original/test");

for (const format of ["png", "webp"] as const) {
  test(`original ${format} keeps its bytes and resolution with CDN, browser, and upstream caching`, async () => {
    const originalFetch = globalThis.fetch;
    const originalUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const source = await sharp({ create: { width: 800, height: 663, channels: 4, background: "#ffca2280" } }).toFormat(format).toBuffer();
    let requested = "";
    let options: RequestInit = {};
    globalThis.fetch = async (url, init) => {
      requested = String(url);
      options = init ?? {};
      // Content-Type must be derived from the bytes, not trusted from upstream.
      return new Response(new Uint8Array(source), { headers: { "content-type": "application/octet-stream" } });
    };
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://wall-test.convex.cloud";
    try {
      const response = await GET(request, { params: Promise.resolve({ storageId }) });
      expect(response.status).toBe(200);
      expect(requested).toBe(`https://wall-test.convex.cloud/api/storage/${storageId}`);
      expect(options).toMatchObject({ cache: "force-cache", next: { revalidate: 604800 } });
      expect(response.headers.get("content-type")).toBe(`image/${format}`);
      expect(response.headers.get("cache-control")).toBe("public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      const bytes = Buffer.from(await response.arrayBuffer());
      expect(bytes.equals(source)).toBe(true);
      expect(await sharp(bytes).metadata()).toMatchObject({ width: 800, height: 663, hasAlpha: true });
    } finally {
      globalThis.fetch = originalFetch;
      if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_CONVEX_URL;
      else process.env.NEXT_PUBLIC_CONVEX_URL = originalUrl;
    }
  });
}

test("original route restricts upstream access and does not cache errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  let requests = 0;
  let upstream = () => new Response("missing", { status: 404 });
  globalThis.fetch = async () => { requests++; return upstream(); };
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://wall-test.convex.cloud";
  const get = (id = storageId) => GET(request, { params: Promise.resolve({ storageId: id }) });
  try {
    expect((await get("https://example.com/image")).status).toBe(400);
    expect(requests).toBe(0);
    const missing = await get();
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBeNull();
    upstream = () => new Response(new Uint8Array(2 * 1024 * 1024 + 1));
    expect((await get()).status).toBe(413);
    upstream = () => new Response("", { headers: { "content-length": String(2 * 1024 * 1024 + 1) } });
    expect((await get()).status).toBe(413);
    const gif = await sharp({ create: { width: 1, height: 1, channels: 4, background: "red" } }).gif().toBuffer();
    upstream = () => new Response(new Uint8Array(gif));
    expect((await get()).status).toBe(415);
    upstream = () => { throw new Error("offline"); };
    expect((await get()).status).toBe(502);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_CONVEX_URL;
    else process.env.NEXT_PUBLIC_CONVEX_URL = originalUrl;
  }
});
