import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const cardStatus = v.union(v.literal("published"), v.literal("removed"));

export default defineSchema({
  cards: defineTable({
    storageId: v.id("_storage"),
    idempotencyKey: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
    // Moderators set this to "removed" in the Convex dashboard to hide a card.
    status: cardStatus,
  })
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_status", ["status"]),
});
