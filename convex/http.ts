import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { MAX_CARD_BYTES, validateCardImage } from "./lib/image";
import { rateLimiter } from "./lib/rateLimits";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{16,64}$/;

function corsHeaders(request: Request): Record<string, string> {
  // CLIENT_ORIGIN accepts a comma-separated list of exact origins.
  const configuredOrigins = process.env.CLIENT_ORIGIN;
  const origin = request.headers.get("Origin");
  const allowedOrigins = configuredOrigins?.split(",").map((value) => value.trim()).filter(Boolean);
  return {
    ...(configuredOrigins === undefined
      ? { "Access-Control-Allow-Origin": "*" }
      : origin && allowedOrigins?.includes(origin)
        ? { "Access-Control-Allow-Origin": origin }
        : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Expose-Headers": "Retry-After",
    Vary: "Origin",
  };
}

function json(request: Request, status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), ...headers, "Content-Type": "application/json" },
  });
}

function tooManyRequests(request: Request, retryAfterMs: number) {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return json(
    request,
    429,
    { error: `Too many submissions. Please try again in ${seconds} seconds.` },
    { "Retry-After": String(seconds) },
  );
}

const submitCard = httpAction(async (ctx, request) => {
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) return json(request, 400, { error: "Missing or invalid Idempotency-Key" });

  const declaredSize = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredSize > MAX_CARD_BYTES) return json(request, 413, { error: "Image too large" });

  const existingId = await ctx.runQuery(internal.cards.findByIdempotencyKey, { idempotencyKey });
  if (existingId) return json(request, 200, { cardId: existingId });

  // Platform-provided IP; unlike X-Forwarded-For it can't be spoofed by the client.
  const { ip } = await ctx.meta.getRequestMetadata();
  const perIp = await rateLimiter.limit(ctx, "submitCardPerIp", { key: ip ?? "unknown" });
  if (!perIp.ok) return tooManyRequests(request, perIp.retryAfter);
  const global = await rateLimiter.limit(ctx, "submitCardGlobal");
  if (!global.ok) return tooManyRequests(request, global.retryAfter);

  const bytes = new Uint8Array(await request.arrayBuffer());
  const image = validateCardImage(bytes);
  if (typeof image === "string") return json(request, 400, { error: image });

  const storageId = await ctx.storage.store(new Blob([bytes], { type: image.mimeType }));
  const result = await ctx.runMutation(internal.cards.createCard, {
    storageId,
    idempotencyKey,
    mimeType: image.mimeType,
    byteSize: bytes.length,
  });

  // A concurrent retry won the race; drop our copy so storage has no orphans.
  if (result.duplicate) await ctx.storage.delete(storageId);

  return json(request, result.duplicate ? 200 : 201, { cardId: result.cardId });
});

const http = httpRouter();

// Download-only images do not create published wall cards.
http.route({
  path: "/card-downloads",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const declaredSize = Number(request.headers.get("Content-Length") ?? 0);
    if (declaredSize > MAX_CARD_BYTES) return json(request, 413, { error: "Image too large" });
    const { ip } = await ctx.meta.getRequestMetadata();
    const perIp = await rateLimiter.limit(ctx, "submitCardPerIp", { key: ip ?? "unknown" });
    if (!perIp.ok) return tooManyRequests(request, perIp.retryAfter);
    const global = await rateLimiter.limit(ctx, "submitCardGlobal");
    if (!global.ok) return tooManyRequests(request, global.retryAfter);
    const bytes = new Uint8Array(await request.arrayBuffer());
    const image = validateCardImage(bytes);
    if (typeof image === "string") return json(request, 400, { error: image });
    const storageId = await ctx.storage.store(new Blob([bytes], { type: image.mimeType }));
    const url = await ctx.storage.getUrl(storageId);
    return json(request, 201, { url });
  }),
});
http.route({
  path: "/card-downloads",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => new Response(null, { status: 204, headers: corsHeaders(request) })),
});

http.route({ path: "/cards", method: "POST", handler: submitCard });
http.route({
  path: "/cards",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => new Response(null, { status: 204, headers: corsHeaders(request) })),
});

export default http;
