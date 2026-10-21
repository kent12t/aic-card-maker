"use client";

import { Maximize2, RotateCw, X } from "lucide-react";
import Image from "next/image";
import type { DragEvent, PointerEvent, RefObject } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH } from "@/lib/card-maker/constants";
import { getHandleStyle } from "@/lib/card-maker/utils";
import type { InteractionMode, SelectedTarget, StickerItem } from "@/lib/card-maker/types";
import styles from "@/app/design/page.module.css";

type CardCanvasProps = {
  cardScale: number;
  selectedFrame: string;
  stickers: StickerItem[];
  selectedTarget: SelectedTarget;
  isCaptureMode: boolean;
  cardViewportRef: RefObject<HTMLDivElement>;
  cardCaptureRef: RefObject<HTMLDivElement>;
  cardRef: RefObject<HTMLDivElement>;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDeselect: () => void;
  onBeginInteraction: (
    event: PointerEvent<HTMLElement>,
    target: SelectedTarget,
    mode: InteractionMode,
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number,
    rotation: number,
  ) => void;
  onDeleteSticker: (id: string) => void;
};

export function CardCanvas({
  cardScale,
  selectedFrame,
  stickers,
  selectedTarget,
  isCaptureMode,
  cardViewportRef,
  cardCaptureRef,
  cardRef,
  onDrop,
  onDeselect,
  onBeginInteraction,
  onDeleteSticker,
}: CardCanvasProps) {
  return (
    <div
      ref={cardViewportRef}
      className={styles.canvasViewport}
    >
      <div
        style={{
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
          transform: `scale(${cardScale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          ref={cardCaptureRef}
          className="relative overflow-hidden"
          style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, backgroundImage: `url(${selectedFrame})`, backgroundSize: "100% 100%", backgroundPosition: "center" }}
        >
          <div
            ref={cardRef}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            onPointerDown={onDeselect}
            className="absolute inset-0 touch-none"
          >

            {stickers
              .slice()
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((sticker) => {
                const isSelected = !isCaptureMode && selectedTarget?.type === "sticker" && selectedTarget.id === sticker.id;
                return (
                  <div
                    key={sticker.id}
                    className={`absolute ${isSelected ? "outline outline-2 outline-[var(--color-violet)]" : ""}`}
                    style={{
                      left: sticker.x,
                      top: sticker.y,
                      width: sticker.width,
                      height: sticker.height,
                      transform: `rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                      transformOrigin: "center",
                      zIndex: sticker.zIndex,
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Move sticker"
                      onPointerDown={(event) =>
                        onBeginInteraction(
                          event,
                          { type: "sticker", id: sticker.id },
                          "move",
                          sticker.x,
                          sticker.y,
                          sticker.width,
                          sticker.height,
                          sticker.scale,
                          sticker.rotation,
                        )
                      }
                      className="relative h-full w-full cursor-grab active:cursor-grabbing"
                    >
                      <Image src={sticker.src} alt="sticker" fill sizes="150px" className="object-contain" unoptimized />
                    </button>

                    {isSelected ? (
                      <>
                        <button
                          type="button"
                          aria-label="Delete sticker"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onDeleteSticker(sticker.id);
                          }}
                          className={`absolute -right-3 -top-3 ${styles.stickerHandle}`}
                          style={getHandleStyle(sticker.scale)}
                        >
                          <X size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label="Rotate sticker"
                          onPointerDown={(event) =>
                            onBeginInteraction(
                              event,
                              { type: "sticker", id: sticker.id },
                              "rotate",
                              sticker.x,
                              sticker.y,
                              sticker.width,
                              sticker.height,
                              sticker.scale,
                              sticker.rotation,
                            )
                          }
                          className={`absolute -left-3 -top-3 ${styles.stickerHandle}`}
                          style={getHandleStyle(sticker.scale)}
                        >
                          <RotateCw size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label="Resize sticker"
                          onPointerDown={(event) =>
                            onBeginInteraction(
                              event,
                              { type: "sticker", id: sticker.id },
                              "resize",
                              sticker.x,
                              sticker.y,
                              sticker.width,
                              sticker.height,
                              sticker.scale,
                              sticker.rotation,
                            )
                          }
                          className={`absolute -bottom-3 -right-3 ${styles.stickerHandle}`}
                          style={getHandleStyle(sticker.scale)}
                        >
                          <Maximize2 size={12} />
                        </button>
                      </>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
