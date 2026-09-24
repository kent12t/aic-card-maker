import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const cardStatus = v.union(v.literal("published"), v.literal("removed"));

export default defineSchema({
  locations: defineTable({
    slug: v.string(),
    name: v.string(),
    active: v.boolean(),
  }).index("by_slug", ["slug"]),

  cards: defineTable({
    storageId: v.id("_storage"),
    locationId: v.optional(v.id("locations")),
    idempotencyKey: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
    // Moderators set this to "removed" in the Convex dashboard to hide a card.
    status: cardStatus,
  })
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_status", ["status"])
    .index("by_location_and_status", ["locationId", "status"]),
});
