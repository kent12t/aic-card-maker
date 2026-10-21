"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import type { DragEvent, RefObject } from "react";
import { ActionButtons } from "@/components/card-maker/ActionButtons";
import { CARD_ASPECT_RATIO, TAB_LABELS } from "@/lib/card-maker/constants";
import type { DragPayload, PaletteItem, TabKey } from "@/lib/card-maker/types";

type MobilePalettePanelProps = {
  activeTab: TabKey;
  activeTabLabel: string;
  mobileTabMenuOpen: boolean;
  mobileTabMenuRef: RefObject<HTMLDivElement>;
  paletteItems: PaletteItem[];
  selectedFrame: string;
  onToggleMenu: () => void;
  onSelectTab: (tab: TabKey) => void;
  onSelectFrame: (src: string) => void;
  onAddSticker: (payload: DragPayload) => void;
  onDragStartItem: (event: DragEvent<HTMLButtonElement>, payload: DragPayload) => void;
  isSubmitting: boolean;
  onRestart: () => void;
  onSubmit: () => void;
  onSave: () => void;
  onShare?: () => void;
  isExporting?: boolean;
};

export function MobilePalettePanel({
  activeTab,
  activeTabLabel,
  mobileTabMenuOpen,
  mobileTabMenuRef,
  paletteItems,
  selectedFrame,
  onToggleMenu,
  onSelectTab,
  onSelectFrame,
  onAddSticker,
  onDragStartItem,
  isSubmitting,
  onRestart,
  onSubmit,
  onSave,
  onShare,
  isExporting,
}: MobilePalettePanelProps) {
  return (
    <div className="w-full space-y-2 lg:hidden">
      <div ref={mobileTabMenuRef} className="relative">
        <button type="button" onClick={onToggleMenu} className="flex h-[36px] w-full items-center rounded-[59px] bg-[#f1f1f1] px-4">
          <span className="flex-1 text-center text-[12px] font-semibold">{activeTabLabel}</span>
          <ChevronDown size={20} className={`transition-transform ${mobileTabMenuOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileTabMenuOpen ? (
          <div className="absolute left-0 right-0 top-[40px] z-30 rounded-[12px] border border-[#d9d9d9] bg-white p-2 shadow-[0_8px_20px_rgba(0,0,0,0.15)]">
            {TAB_LABELS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onSelectTab(tab.key)}
                  className={`block h-[44px] w-full rounded-[8px] px-3 text-left text-[12px] font-semibold ${isActive ? "bg-[#e3e3e3]" : "bg-transparent"}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="rounded-[10px] border border-[#f1f1f1] pb-2">
        <div className="h-[224px] overflow-x-auto overflow-y-hidden px-1 py-1">
          {activeTab === "frames" ? (
            <div className="flex h-full w-max items-center gap-4 pr-2">
              {paletteItems.map((item, index) => (
                <button
                  key={item.src}
                  type="button"
                  onClick={() => onSelectFrame(item.src)}
                  style={{ aspectRatio: CARD_ASPECT_RATIO }}
                  className={`relative w-[126px] overflow-hidden rounded-sm border ${
                    selectedFrame === item.src ? "border-[#ff661e]" : "border-transparent"
                  }`}
                >
                  <Image src={item.src} alt="frame" fill sizes="126px" className="object-contain" unoptimized priority={index === 0} />
                </button>
              ))}
            </div>
          ) : (
            <div className={`grid h-full w-max grid-flow-col gap-x-4 gap-y-1 pr-2 ${activeTab === "persons" ? "grid-rows-1 items-center" : "grid-rows-2"}`}>
              {paletteItems.map((item, index) => (
                <button
                  key={item.src}
                  type="button"
                  draggable
                  onClick={() => onAddSticker({ src: item.src, width: item.width, height: item.height })}
                  onDragStart={(event) => onDragStartItem(event, { src: item.src, width: item.width, height: item.height })}
                  className={`relative rounded-md ${activeTab === "persons" ? "h-[130px] w-[90px]" : "h-[96px] w-[112px]"}`}
                >
                  <Image src={item.src} alt="palette sticker" fill sizes="130px" className="object-contain" unoptimized priority={index === 0} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ActionButtons mobile isSubmitting={isSubmitting} isExporting={isExporting} onRestart={onRestart} onSubmit={onSubmit} onSave={onSave} onShare={onShare} />
    </div>
  );
}
