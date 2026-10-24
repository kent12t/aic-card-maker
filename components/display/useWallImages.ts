"use client";

import { useEffect, useRef, useState } from "react";
import type { WallCard } from "./brickWall";
import { imagePolicy, thumbnailPath, WallImagePool, type ImagePoolSnapshot } from "./wallImagePool";

type Connection = { saveData?: boolean; effectiveType?: string };

async function loadThumbnail(source: string, signal: AbortSignal) {
  const response = await fetch(thumbnailPath(source), {
    signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
    cache: "force-cache",
  });
  if (!response.ok) throw new Error("Thumbnail unavailable");
  const url = URL.createObjectURL(await response.blob());
  const image = new window.Image();
  image.src = url;
  try {
    await image.decode();
    return { url, dispose: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export function useWallImages(cards: WallCard[] | undefined, spotlight?: WallCard) {
  const [snapshot, setSnapshot] = useState<ImagePoolSnapshot>({ cards: [], failed: false, loading: true });
  const poolRef = useRef<WallImagePool | null>(null);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const constrained = Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? ""));
    const pool = new WallImagePool(imagePolicy(window.matchMedia("(max-width: 600px)").matches, constrained), loadThumbnail, setSnapshot);
    poolRef.current = pool;
    const visibilityChanged = () => pool.setPaused(document.hidden);
    visibilityChanged();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      document.removeEventListener("visibilitychange", visibilityChanged);
      pool.dispose();
      poolRef.current = null;
    };
  }, []);

  useEffect(() => {
    poolRef.current?.update(cards ?? [], spotlight);
  }, [cards, spotlight]);

  return { ...snapshot, retry: () => poolRef.current?.retry() };
}
