"use client";

import { useQuery } from "convex/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { BrickWall, type WallCard, type WallSnapshot } from "./brickWall";
import { useWallImages } from "./useWallImages";
import styles from "@/app/display/page.module.css";

// Elements mount off-screen; the animation loop moves them into place on the next frame.
const OFFSCREEN = "translate3d(-9999px, 0, 0)";

export function CardWall({ spotlightCardId }: { spotlightCardId?: string }) {
  // Convex keeps this subscription live: inserts and moderator removals re-run the query and push new results.
  const cards = useQuery(api.cards.listPublished);
  const recentSpotlightCard = cards?.find((card) => card._id === spotlightCardId);
  const needsSpotlightLookup = Boolean(spotlightCardId && cards !== undefined && !recentSpotlightCard);
  const spotlightLookup = useQuery(
    api.cards.getPublishedById,
    needsSpotlightLookup ? { cardId: spotlightCardId! } : "skip",
  );
  const spotlightCard = recentSpotlightCard ?? spotlightLookup ?? undefined;
  const { cards: decodedCards, loading, failed, retry } = useWallImages(cards, spotlightCard);
  const wallCards = useMemo(() => {
    if (!cards) return undefined;
    const published = new Set<string>(cards.map((card) => card._id));
    if (spotlightCard) published.add(spotlightCard._id);
    return decodedCards.filter((card) => published.has(card._id));
  }, [cards, spotlightCard, decodedCards]);
  const decodedSpotlight = wallCards?.find((card) => card._id === spotlightCardId);

  const [snapshot, setSnapshot] = useState<WallSnapshot | null>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<WallCard[] | undefined>(undefined);
  const sizeRef = useRef({ width: 0, height: 0 });
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const replayCardIdRef = useRef<string | undefined>(undefined);
  const publishedIdsRef = useRef<Set<string> | null>(null);
  const arrivalIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!cards) return;
    const ids = new Set<string>(cards.map((card) => card._id));
    const previous = publishedIdsRef.current;
    if (previous) for (const id of ids) if (!previous.has(id)) arrivalIdsRef.current.add(id);
    for (const id of arrivalIdsRef.current) if (!ids.has(id)) arrivalIdsRef.current.delete(id);
    publishedIdsRef.current = ids;
  }, [cards]);

  useEffect(() => {
    replayCardIdRef.current = undefined;
    // The pool has already decoded this image; no full-size spotlight download is needed.
    if (decodedSpotlight) replayCardIdRef.current = decodedSpotlight._id;
  }, [decodedSpotlight]);

  useEffect(() => {
    cardsRef.current = wallCards;
  }, [wallCards]);

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
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const { width, height } = sizeRef.current;
      if (!document.hidden && wall.tick(now - last, cardsRef.current, width, height, replayCardIdRef.current, motionPreference.matches, arrivalIdsRef.current)) setSnapshot(wall.snapshot());
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
    <main className="flex h-screen flex-col overflow-hidden bg-black py-6">
      <header className={styles.header}>
        <div className={styles.logos}>
          <Link href="/" aria-label="Community Care Day home">
          <Image className={styles.aicLogo} src="/assets/misc/aic_logo.svg" alt="Agency for Integrated Care" width={249} height={179} priority />
          </Link>
          <a href="https://www.aic.sg/ccd2026" target="_blank" rel="noopener noreferrer"><Image className={styles.ccdLogo} src="/assets/misc/ccd-logo.svg" alt="Community Care Day" width={681} height={215} priority /></a>
        </div>
        <h1 className={styles.title}>Celebrating Community Care Day | 1 Nov</h1>
      </header>

      <div ref={wallRef} className="relative isolate min-h-0 flex-1 overflow-hidden">
        {needsSpotlightLookup && spotlightLookup === null && (
          <p role="status" className="absolute inset-x-0 top-0 z-20 rounded-lg bg-black/80 p-3 text-center text-sm text-white">
            This card is no longer available on the wall. Enjoy the latest thank you cards below.
          </p>
        )}
        {cards === undefined || (loading && !wallCards?.length && cards.length > 0) ? (
          <p className="px-6 text-[18px] font-semibold text-white/60">Loading cards…</p>
        ) : cards.length === 0 ? (
          <p className="px-6 text-[18px] font-semibold text-white/60">Cards will appear here as they are submitted.</p>
        ) : null}
        {failed && !wallCards?.length && cards && cards.length > 0 && (
          <p role="status" className="px-6 text-[18px] text-white/80">
            Cards couldn&apos;t load. <button onClick={retry} className="underline">Try again</button>
          </p>
        )}

        {snapshot?.bricks.map((brick) => (
          <div
            key={brick.key}
            data-card-id={brick.cardId}
            ref={register(brick.key)}
            className={styles.floatingCard}
            style={{ width: snapshot.cellWidth, height: snapshot.cell, transform: OFFSCREEN, zIndex: Math.round(brick.depth * 4) }}
          >
            <div className={styles.cardArtwork} style={{ filter: `drop-shadow(0 ${2 + brick.depth * 6}px ${2 + brick.depth * 7}px rgba(143, 143, 198, ${0.1 + brick.depth * 0.15}))` }}>
              <Image src={brick.url} alt="Community Care Day card" fill sizes={`${snapshot.cellWidth}px`} className="object-contain" unoptimized loading="eager" />
              <span
                aria-hidden="true"
                className={styles.distanceTint}
                style={{ opacity: 0.04 + (1 - brick.depth) * 0.36, maskImage: `url(${JSON.stringify(brick.url)})` }}
              />
            </div>
          </div>
        ))}

        {snapshot?.features.map((feature) => (
          <div
            key={feature.key}
            data-card-id={feature.cardId}
            ref={register(feature.key)}
            className={`${styles.floatingCard} ${styles.featureCard}`}
            style={{ width: snapshot.bigWidth, height: snapshot.bigSize, transform: OFFSCREEN }}
          >
            <div className={styles.featureArtwork}>
              <Image src={feature.url} alt="New Community Care Day card" fill sizes={`${Math.ceil(snapshot.bigWidth)}px`} className="object-contain" unoptimized loading="eager" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
