"use client";

import { useQuery } from "convex/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { BrickWall, type WallCard, type WallSnapshot } from "./brickWall";
import { CardSpotlight } from "./CardSpotlight";

// Elements mount off-screen; the animation loop moves them into place on the next frame.
const OFFSCREEN = "translate3d(-9999px, 0, 0)";

export function CardWall({ spotlightCardId }: { spotlightCardId?: string }) {
  // Convex keeps this subscription live: inserts and moderator removals re-run the query and push new results.
  const cards = useQuery(api.cards.listPublished);
  const spotlightCard = cards?.find((card) => card._id === spotlightCardId);

  const [snapshot, setSnapshot] = useState<WallSnapshot | null>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<WallCard[] | undefined>(undefined);
  const sizeRef = useRef({ width: 0, height: 0 });
  const elementsRef = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;
    const observer = new ResizeObserver(([entry]) => {
      sizeRef.current = { width: entry.contentRect.width, height: entry.contentRect.height };
    });
    observer.observe(wall);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Positions are written straight to the DOM every frame; React only re-renders when cards enter or leave.
    const wall = new BrickWall(elementsRef.current);
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const { width, height } = sizeRef.current;
      if (wall.tick(now - last, cardsRef.current, width, height)) setSnapshot(wall.snapshot());
      last = now;
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const register = (key: string) => (element: HTMLDivElement | null) => {
    if (element) elementsRef.current.set(key, element);
    else elementsRef.current.delete(key);
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-black px-6 py-6">
      <h1 className="mb-6 font-open-sans text-[32px] font-bold text-[#ff661e]">Community Care Day</h1>

      <div ref={wallRef} className="relative min-h-0 flex-1 overflow-hidden">
        {spotlightCard && <CardSpotlight key={spotlightCard._id} url={spotlightCard.url} />}
        {spotlightCardId && cards !== undefined && !spotlightCard && (
          <p role="status" className="absolute inset-x-0 top-0 z-20 rounded-lg bg-black/80 p-3 text-center text-sm text-white">
            This card is no longer available on the wall. Enjoy the latest thank you cards below.
          </p>
        )}
        {cards === undefined ? (
          <p className="text-[18px] font-semibold text-white/60">Loading cards…</p>
        ) : cards.length === 0 ? (
          <p className="text-[18px] font-semibold text-white/60">Cards will appear here as they are submitted.</p>
        ) : null}

        {snapshot?.bricks.map((brick) => (
          <div
            key={brick.key}
            ref={register(brick.key)}
            className="absolute left-0 top-0 p-1 will-change-transform"
            style={{ width: snapshot.cell, height: snapshot.cell, transform: OFFSCREEN }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-[6px]">
              <Image src={brick.url} alt="Community Care Day card" fill sizes={`${snapshot.cell}px`} className="object-cover" unoptimized />
            </div>
          </div>
        ))}

        {snapshot?.features.map((feature) => (
          <div
            key={feature.key}
            ref={register(feature.key)}
            className="absolute left-0 top-0 z-10 will-change-transform"
            style={{ width: snapshot.bigSize, height: snapshot.bigSize, transform: OFFSCREEN }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-[16px] shadow-[0_0_60px_rgba(255,102,30,0.45)]">
              <Image src={feature.url} alt="New Community Care Day card" fill sizes={`${Math.ceil(snapshot.bigSize)}px`} className="object-cover" unoptimized priority />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
