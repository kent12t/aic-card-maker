"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { originalImagePath } from "@/lib/wall-image-url";

/** Keep the decoded thumbnail visible until the original is ready to display. */
export function HighlightImage({ thumbnail, original, width }: { thumbnail: string; original?: string; width: number }) {
  const [decodedOriginal, setDecodedOriginal] = useState<string>();

  useEffect(() => {
    if (!original) return;
    let cancelled = false;
    const image = new window.Image();
    // Use the same-origin CDN URL for both preloading and rendering.
    const source = originalImagePath(original);
    image.src = source;
    void image.decode().then(() => {
      if (!cancelled) setDecodedOriginal(source);
    }).catch(() => {
      // A failed original must not interrupt the highlight or blank its artwork.
    });
    return () => { cancelled = true; };
  }, [original]);

  return (
    <Image
      src={original && decodedOriginal === originalImagePath(original) ? decodedOriginal : thumbnail}
      alt="New Community Care Day card"
      fill
      sizes={`${Math.ceil(width)}px`}
      className="object-contain"
      unoptimized
      loading="eager"
    />
  );
}
