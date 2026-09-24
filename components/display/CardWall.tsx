"use client";

import { useQuery } from "convex/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const FEATURE_MS = 2000;

type WallCard = { _id: Id<"cards">; _creationTime: number; url: string };

export function CardWall() {
  // Convex keeps this subscription live: inserts and moderator removals re-run the query and push new results.
  const cards = useQuery(api.cards.listPublished);

  const [lastCards, setLastCards] = useState<WallCard[] | undefined>(undefined);
  const [knownIds, setKnownIds] = useState<Set<string> | null>(null);
  const [featureQueue, setFeatureQueue] = useState<Id<"cards">[]>([]);

  // Adjust state during render when the query result changes (cards already on the wall at load are not featured).
  if (cards !== lastCards) {
    setLastCards(cards);
    if (cards) {
      if (knownIds) {
        const fresh = cards.filter((card) => !knownIds.has(card._id)).reverse();
        if (fresh.length) setFeatureQueue((queue) => [...queue, ...fresh.map((card) => card._id)]);
      }
      setKnownIds(new Set([...(knownIds ?? []), ...cards.map((card) => card._id)]));
    }
  }

  const featuredId = featureQueue[0];
  const featured = cards?.find((card) => card._id === featuredId);
  const hasFeatured = featured !== undefined;

  useEffect(() => {
    if (!featuredId) return;
    // Skip straight past cards that were removed while waiting in the queue.
    const timer = setTimeout(() => setFeatureQueue((queue) => queue.slice(1)), hasFeatured ? FEATURE_MS : 0);
    return () => clearTimeout(timer);
  }, [featuredId, hasFeatured]);

  const queued = new Set<string>(featureQueue);
  const gridCards = cards?.filter((card) => !queued.has(card._id)) ?? [];

  return (
    <main className="min-h-screen bg-white px-6 py-6">
      <h1 className="mb-6 font-open-sans text-[32px] font-bold text-[#ff661e]">Community Care Day</h1>

      {cards === undefined ? (
        <p className="text-[18px] font-semibold text-black/60">Loading cards…</p>
      ) : cards.length === 0 ? (
        <p className="text-[18px] font-semibold text-black/60">Cards will appear here as they are submitted.</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
          {gridCards.map((card) => (
            <li key={card._id} className="relative aspect-square overflow-hidden rounded-[12px] shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
              <Image src={card.url} alt="Community Care Day card" fill sizes="240px" className="object-cover" unoptimized />
            </li>
          ))}
        </ul>
      )}

      {featured ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative aspect-square w-[min(70vw,70vh)] overflow-hidden rounded-[16px] shadow-2xl">
            <Image src={featured.url} alt="New Community Care Day card" fill sizes="70vw" className="object-cover" unoptimized priority />
          </div>
        </div>
      ) : null}
    </main>
  );
}
