"use client";

import { Maximize2, Pencil, RotateCw, X } from "lucide-react";
import Image from "next/image";
import type { DragEvent, PointerEvent, RefObject } from "react";
import { BOARD_SIZE } from "@/lib/card-maker/constants";
import { getFontClass, getHandleStyle } from "@/lib/card-maker/utils";
import type { InteractionMode, SelectedTarget, StickerItem, TextItem } from "@/lib/card-maker/types";

type CardCanvasProps = {
  cardScale: number;
  selectedFrame: string;
  texts: TextItem[];
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
  onDeleteText: (id: string) => void;
  onEditText: (target: TextItem) => void;
  onDeleteSticker: (id: string) => void;
};

export function CardCanvas({
  cardScale,
  selectedFrame,
  texts,
  stickers,
  selectedTarget,
  isCaptureMode,
  cardViewportRef,
  cardCaptureRef,
  cardRef,
  onDrop,
  onDeselect,
  onBeginInteraction,
  onDeleteText,
  onEditText,
  onDeleteSticker,
}: CardCanvasProps) {
  return (
    <div
      ref={cardViewportRef}
      className="sticky top-0 z-20 w-full max-w-[443px] overflow-hidden bg-white lg:static lg:w-[443px]"
      style={{ height: BOARD_SIZE * cardScale }}
    >
      <div
        style={{
          width: BOARD_SIZE,
          height: BOARD_SIZE,
          transform: `scale(${cardScale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          ref={cardCaptureRef}
          className="relative h-[443px] w-[443px] overflow-hidden"
          style={{ backgroundImage: `url(${selectedFrame})`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div
            ref={cardRef}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
            onPointerDown={onDeselect}
            className="absolute inset-0 touch-none"
          >

            {texts
              .slice()
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((text) => {
                const isSelected = !isCaptureMode && selectedTarget?.type === "text" && selectedTarget.id === text.id;
                return (
                  <div
                    key={text.id}
                    className={`absolute ${isSelected ? "outline outline-1 outline-[#6ab5ff]" : ""}`}
                    style={{
                      left: text.x,
                      top: text.y,
                      width: text.width,
                      height: text.height,
                      transform: `rotate(${text.rotation}deg) scale(${text.scale})`,
                      transformOrigin: "center",
                      zIndex: text.zIndex,
                    }}
                  >
                    <button
                      type="button"
                      onPointerDown={(event) =>
                        onBeginInteraction(event, { type: "text", id: text.id }, "move", text.x, text.y, text.width, text.height, text.scale, text.rotation)
                      }
                      onDoubleClick={() => onEditText(text)}
                      className={`flex h-full w-full cursor-grab items-center justify-center whitespace-pre text-center leading-[0.9] active:cursor-grabbing ${getFontClass(text.font)}`}
                      style={{ color: text.color, fontSize: text.fontSize / 4 }}
                    >
                      {text.text}
                    </button>
                    {isSelected ? (
                      <>
                        <button
                          type="button"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onDeleteText(text.id);
                          }}
                          className="absolute -right-3 -top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                          style={getHandleStyle(text.scale)}
                        >
                          <X size={14} />
                        </button>
                        <button
                          type="button"
                          onPointerDown={(event) =>
                            onBeginInteraction(event, { type: "text", id: text.id }, "rotate", text.x, text.y, text.width, text.height, text.scale, text.rotation)
                          }
                          className="absolute -left-3 -top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                          style={getHandleStyle(text.scale)}
                        >
                          <RotateCw size={13} />
                        </button>
                        <button
                          type="button"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onEditText(text);
                          }}
                          className="absolute -bottom-3 -left-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                          style={getHandleStyle(text.scale)}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onPointerDown={(event) =>
                            onBeginInteraction(event, { type: "text", id: text.id }, "resize", text.x, text.y, text.width, text.height, text.scale, text.rotation)
                          }
                          className="absolute -bottom-3 -right-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                          style={getHandleStyle(text.scale)}
                        >
                          <Maximize2 size={12} />
                        </button>
                      </>
                    ) : null}
                  </div>
                );
              })}

            {stickers
              .slice()
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((sticker) => {
                const isSelected = !isCaptureMode && selectedTarget?.type === "sticker" && selectedTarget.id === sticker.id;
                return (
                  <div
                    key={sticker.id}
                    className={`absolute ${isSelected ? "outline outline-2 outline-[#6ab5ff]" : ""}`}
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
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onDeleteSticker(sticker.id);
                          }}
                          className="absolute -right-3 -top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                          style={getHandleStyle(sticker.scale)}
                        >
                          <X size={14} />
                        </button>
                        <button
                          type="button"
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
                          className="absolute -left-3 -top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                          style={getHandleStyle(sticker.scale)}
                        >
                          <RotateCw size={13} />
                        </button>
                        <button
                          type="button"
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
                          className="absolute -bottom-3 -right-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
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
