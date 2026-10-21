"use client";

import Image from "next/image";
import type { DragEvent } from "react";
import { CARD_ASPECT_RATIO, TAB_LABELS } from "@/lib/card-maker/constants";
import type { DragPayload, PaletteItem, TabKey } from "@/lib/card-maker/types";

type DesktopPalettePanelProps = {
  activeTab: TabKey;
  paletteItems: PaletteItem[];
  selectedFrame: string;
  onSelectTab: (tab: TabKey) => void;
  onSelectFrame: (src: string) => void;
  onDragStartItem: (event: DragEvent<HTMLButtonElement>, payload: DragPayload) => void;
};

export function DesktopPalettePanel({
  activeTab,
  paletteItems,
  selectedFrame,
  onSelectTab,
  onSelectFrame,
  onDragStartItem,
}: DesktopPalettePanelProps) {
  return (
    <section className="hidden w-full lg:block lg:h-[528px] lg:w-[480px] lg:rounded-2xl lg:border lg:border-[#e9e9e9] lg:bg-white lg:p-4 lg:shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
      <div>
        <div className="flex h-[40px] gap-2">
          {TAB_LABELS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              className={`flex h-full flex-1 items-center justify-center rounded-[10px] text-[15px] leading-none ${
                activeTab === tab.key ? "bg-[#ffe27d]" : "bg-white"
              }`}
            >
              <span className={activeTab === tab.key ? "font-bold" : "font-semibold"}>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 h-[416px] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-4">
            {paletteItems.map((item, index) => {
              const isAboveFold = index === 0;

              if (item.frame) {
                return (
                  <button
                    key={item.src}
                    type="button"
                    onClick={() => onSelectFrame(item.src)}
                    style={{ aspectRatio: CARD_ASPECT_RATIO }}
                    className={`relative w-[126px] overflow-hidden rounded-sm border ${
                      selectedFrame === item.src ? "border-[#ff661e]" : "border-transparent"
                    }`}
                  >
                    <Image src={item.src} alt="frame" fill sizes="126px" className="object-contain" unoptimized priority={isAboveFold} />
                  </button>
                );
              }

              return (
                <button
                  key={item.src}
                  type="button"
                  draggable
                  onDragStart={(event) => onDragStartItem(event, { src: item.src, width: item.width, height: item.height })}
                  className={`relative rounded-md ${activeTab === "persons" ? "h-[130px]" : "h-[112px]"}`}
                >
                  <Image src={item.src} alt="palette sticker" fill sizes="120px" className="object-contain" unoptimized priority={isAboveFold} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
