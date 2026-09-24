import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";

const WALL_LIMIT = 200;

async function findActiveLocation(ctx: QueryCtx, slug: string) {
  const location = await ctx.db
    .query("locations")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  return location?.active ? location : null;
}

/** Runs before the image is stored so retries and bad locations never touch storage. */
export const prepareSubmission = internalQuery({
  args: { idempotencyKey: v.string(), locationSlug: v.optional(v.string()) },
  returns: v.union(
    v.object({ kind: v.literal("duplicate"), cardId: v.id("cards") }),
    v.object({ kind: v.literal("invalidLocation") }),
    v.object({ kind: v.literal("ok"), locationId: v.optional(v.id("locations")) }),
  ),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cards")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (existing) return { kind: "duplicate" as const, cardId: existing._id };

    if (args.locationSlug === undefined) return { kind: "ok" as const };
    const location = await findActiveLocation(ctx, args.locationSlug);
    if (!location) return { kind: "invalidLocation" as const };
    return { kind: "ok" as const, locationId: location._id };
  },
});

export const createCard = internalMutation({
  args: {
    storageId: v.id("_storage"),
    locationId: v.optional(v.id("locations")),
    idempotencyKey: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
  },
  returns: v.object({ cardId: v.id("cards"), duplicate: v.boolean() }),
  handler: async (ctx, args) => {
    // Re-checked here because mutations are transactional; the earlier query is only an optimisation.
    const existing = await ctx.db
      .query("cards")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    if (existing) return { cardId: existing._id, duplicate: true };

    const cardId = await ctx.db.insert("cards", { ...args, status: "published" });
    return { cardId, duplicate: false };
  },
});

export const listPublished = query({
  args: { location: v.optional(v.string()) },
  returns: v.array(v.object({ _id: v.id("cards"), _creationTime: v.number(), url: v.string() })),
  handler: async (ctx, args) => {
    let cards;
    if (args.location === undefined) {
      cards = await ctx.db
        .query("cards")
        .withIndex("by_status", (q) => q.eq("status", "published"))
        .order("desc")
        .take(WALL_LIMIT);
    } else {
      const location = await findActiveLocation(ctx, args.location);
      if (!location) return [];
      cards = await ctx.db
        .query("cards")
        .withIndex("by_location_and_status", (q) => q.eq("locationId", location._id).eq("status", "published"))
        .order("desc")
        .take(WALL_LIMIT);
    }

    const withUrls = await Promise.all(
      cards.map(async (card) => ({
        _id: card._id,
        _creationTime: card._creationTime,
        url: await ctx.storage.getUrl(card.storageId),
      })),
    );
    return withUrls.filter((card): card is typeof card & { url: string } => card.url !== null);
  },
});
