import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { MAX_CARD_BYTES, validateCardImage } from "./lib/image";
import { rateLimiter } from "./lib/rateLimits";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{16,64}$/;

function corsHeaders(): HeadersInit {
  return {
    // Set CLIENT_ORIGIN in the Convex dashboard (e.g. https://your-app.vercel.app) to lock this down.
    "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Expose-Headers": "Retry-After",
    Vary: "Origin",
  };
}

function json(status: number, body: Record<string, unknown>, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), ...headers, "Content-Type": "application/json" },
  });
}

function tooManyRequests(retryAfterMs: number) {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return json(
    429,
    { error: `Too many submissions. Please try again in ${seconds} seconds.` },
    { "Retry-After": String(seconds) },
  );
}

const submitCard = httpAction(async (ctx, request) => {
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) return json(400, { error: "Missing or invalid Idempotency-Key" });

  const declaredSize = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredSize > MAX_CARD_BYTES) return json(413, { error: "Image too large" });

  const existingId = await ctx.runQuery(internal.cards.findByIdempotencyKey, { idempotencyKey });
  if (existingId) return json(200, { cardId: existingId });

  // Platform-provided IP; unlike X-Forwarded-For it can't be spoofed by the client.
  const { ip } = await ctx.meta.getRequestMetadata();
  const perIp = await rateLimiter.limit(ctx, "submitCardPerIp", { key: ip ?? "unknown" });
  if (!perIp.ok) return tooManyRequests(perIp.retryAfter);
  const global = await rateLimiter.limit(ctx, "submitCardGlobal");
  if (!global.ok) return tooManyRequests(global.retryAfter);

  const bytes = new Uint8Array(await request.arrayBuffer());
  const image = validateCardImage(bytes);
  if (typeof image === "string") return json(400, { error: image });

  const storageId = await ctx.storage.store(new Blob([bytes], { type: image.mimeType }));
  const result = await ctx.runMutation(internal.cards.createCard, {
    storageId,
    idempotencyKey,
    mimeType: image.mimeType,
    byteSize: bytes.length,
  });

  // A concurrent retry won the race; drop our copy so storage has no orphans.
  if (result.duplicate) await ctx.storage.delete(storageId);

  return json(result.duplicate ? 200 : 201, { cardId: result.cardId });
});

const http = httpRouter();

// Download-only images do not create published wall cards.
http.route({
  path: "/card-downloads",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const declaredSize = Number(request.headers.get("Content-Length") ?? 0);
    if (declaredSize > MAX_CARD_BYTES) return json(413, { error: "Image too large" });
    const { ip } = await ctx.meta.getRequestMetadata();
    const perIp = await rateLimiter.limit(ctx, "submitCardPerIp", { key: ip ?? "unknown" });
    if (!perIp.ok) return tooManyRequests(perIp.retryAfter);
    const global = await rateLimiter.limit(ctx, "submitCardGlobal");
    if (!global.ok) return tooManyRequests(global.retryAfter);
    const bytes = new Uint8Array(await request.arrayBuffer());
    const image = validateCardImage(bytes);
    if (typeof image === "string") return json(400, { error: image });
    const storageId = await ctx.storage.store(new Blob([bytes], { type: image.mimeType }));
    const url = await ctx.storage.getUrl(storageId);
    return json(201, { url });
  }),
});
http.route({
  path: "/card-downloads",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders() })),
});

http.route({ path: "/cards", method: "POST", handler: submitCard });
http.route({
  path: "/cards",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders() })),
});

export default http;
