import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { MAX_CARD_BYTES, validateCardImage } from "./lib/image";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{16,64}$/;

function corsHeaders(): HeadersInit {
  return {
    // Set CLIENT_ORIGIN in the Convex dashboard (e.g. https://your-app.vercel.app) to lock this down.
    "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

const submitCard = httpAction(async (ctx, request) => {
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? "";
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) return json(400, { error: "Missing or invalid Idempotency-Key" });

  const declaredSize = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredSize > MAX_CARD_BYTES) return json(413, { error: "Image too large" });

  const locationSlug = new URL(request.url).searchParams.get("location") ?? undefined;
  const prepared = await ctx.runQuery(internal.cards.prepareSubmission, { idempotencyKey, locationSlug });
  if (prepared.kind === "duplicate") return json(200, { cardId: prepared.cardId });
  if (prepared.kind === "invalidLocation") return json(400, { error: "Unknown location" });

  const bytes = new Uint8Array(await request.arrayBuffer());
  const image = validateCardImage(bytes);
  if (typeof image === "string") return json(400, { error: image });

  const storageId = await ctx.storage.store(new Blob([bytes], { type: image.mimeType }));
  const result = await ctx.runMutation(internal.cards.createCard, {
    storageId,
    locationId: prepared.locationId,
    idempotencyKey,
    mimeType: image.mimeType,
    byteSize: bytes.length,
  });

  // A concurrent retry won the race; drop our copy so storage has no orphans.
  if (result.duplicate) await ctx.storage.delete(storageId);

  return json(result.duplicate ? 200 : 201, { cardId: result.cardId });
});

const http = httpRouter();

http.route({ path: "/cards", method: "POST", handler: submitCard });
http.route({
  path: "/cards",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: corsHeaders() })),
});

export default http;
