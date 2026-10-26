import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

const WALL_LIMIT = 200;
const wallCard = v.object({
  _id: v.id("cards"),
  _creationTime: v.number(),
  url: v.string(),
});

/** Runs before the image is stored so retries never touch storage. */
export const findByIdempotencyKey = internalQuery({
  args: { idempotencyKey: v.string() },
  returns: v.union(v.id("cards"), v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cards")
      .withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey))
      .unique();
    return existing?._id ?? null;
  },
});

export const createCard = internalMutation({
  args: {
    storageId: v.id("_storage"),
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
  args: {},
  returns: v.array(wallCard),
  handler: async (ctx) => {
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(WALL_LIMIT);

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

export const getPublishedById = query({
  args: { cardId: v.string() },
  returns: v.union(wallCard, v.null()),
  handler: async (ctx, args) => {
    const cardId = ctx.db.normalizeId("cards", args.cardId);
    if (cardId === null) return null;

    const card = await ctx.db.get("cards", cardId);
    if (card?.status !== "published") return null;

    const url = await ctx.storage.getUrl(card.storageId);
    return url === null ? null : { _id: card._id, _creationTime: card._creationTime, url };
  },
});
