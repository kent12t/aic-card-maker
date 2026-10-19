"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/** A personal replay; never writes to Convex or changes another wall's animation. */
export function CardSpotlight({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!loaded || finished) return;
    let remaining = 5000;
    let startedAt: number | null = null;
    let timer: number | undefined;

    function updateTimer() {
      if (timer !== undefined) window.clearTimeout(timer);
      if (startedAt !== null) remaining -= performance.now() - startedAt;
      startedAt = null;
      if (remaining <= 0) {
        setFinished(true);
      } else if (document.visibilityState === "visible") {
        startedAt = performance.now();
        timer = window.setTimeout(() => setFinished(true), remaining);
      }
    }

    updateTimer();
    document.addEventListener("visibilitychange", updateTimer);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", updateTimer);
    };
  }, [loaded, finished]);

  if (finished) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/80 p-4" role="region" aria-label="Your submitted card">
      <p className="text-center text-xl font-bold text-white">Your thank you card</p>
      {failed ? (
        <p role="status" className="text-center text-white">We couldn’t load the preview. Your card has still been submitted.</p>
      ) : (
        <div className="relative aspect-square w-full max-w-[min(640px,max(80px,calc(100dvh-300px)))] overflow-hidden rounded-2xl shadow-[0_0_60px_rgba(255,102,30,0.45)]">
          <Image
            src={url}
            alt="Your submitted thank you card"
            fill
            sizes="(max-width: 680px) 90vw, 640px"
            className="object-contain"
            unoptimized
            priority
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </div>
      )}
      <p className="text-center text-sm text-white/80" role="status">
        {failed ? "" : loaded ? "Joining the display wall in a moment…" : "Loading your card…"}
      </p>
      <button type="button" onClick={() => setFinished(true)} className="rounded-full border border-white/50 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10">
        View the wall now
      </button>
    </div>
  );
}
