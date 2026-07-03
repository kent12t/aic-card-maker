"use client";

import { ChevronDown, Type, Upload } from "lucide-react";
import Image from "next/image";
import type { ChangeEvent, DragEvent, RefObject } from "react";
import { ActionButtons } from "@/components/card-maker/ActionButtons";
import { TAB_LABELS } from "@/lib/card-maker/constants";
import type { DragPayload, PaletteItem, TabKey } from "@/lib/card-maker/types";

type MobilePalettePanelProps = {
  activeTab: TabKey;
  activeTabLabel: string;
  mobileTabMenuOpen: boolean;
  mobileTabMenuRef: RefObject<HTMLDivElement>;
  paletteItems: PaletteItem[];
  selectedFrame: string;
  fileInputRef: RefObject<HTMLInputElement>;
  onToggleMenu: () => void;
  onSelectTab: (tab: TabKey) => void;
  onSelectFrame: (src: string) => void;
  onAddText: () => void;
  onAddSticker: (payload: DragPayload) => void;
  onDragStartItem: (event: DragEvent<HTMLButtonElement>, payload: DragPayload) => void;
  onDropUpload: (event: DragEvent<HTMLLabelElement>) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRestart: () => void;
  onSubmit: () => void;
  onSave: () => void;
};

export function MobilePalettePanel({
  activeTab,
  activeTabLabel,
  mobileTabMenuOpen,
  mobileTabMenuRef,
  paletteItems,
  selectedFrame,
  fileInputRef,
  onToggleMenu,
  onSelectTab,
  onSelectFrame,
  onAddText,
  onAddSticker,
  onDragStartItem,
  onDropUpload,
  onUpload,
  onRestart,
  onSubmit,
  onSave,
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
              {paletteItems.map((item) => (
                <button
                  key={item.src}
                  type="button"
                  onClick={() => onSelectFrame(item.src)}
                  className={`relative h-[126px] w-[126px] overflow-hidden rounded-sm border ${
                    selectedFrame === item.src ? "border-[#ff661e]" : "border-transparent"
                  }`}
                >
                  <Image src={item.src} alt="frame" fill sizes="126px" className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          ) : (
            <div className={`grid h-full w-max grid-flow-col gap-x-4 gap-y-1 pr-2 ${activeTab === "persons" ? "grid-rows-1 items-center" : "grid-rows-2"}`}>
              {paletteItems.map((item) => (
                <button
                  key={item.src}
                  type="button"
                  draggable
                  onClick={() => onAddSticker({ src: item.src, width: item.width, height: item.height })}
                  onDragStart={(event) => onDragStartItem(event, { src: item.src, width: item.width, height: item.height })}
                  className={`relative rounded-md ${activeTab === "persons" ? "h-[130px] w-[90px]" : "h-[96px] w-[112px]"}`}
                >
                  <Image src={item.src} alt="palette sticker" fill sizes="130px" className="object-contain" unoptimized />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onAddText}
        className="mt-4 flex h-[42px] w-[120px] items-center justify-center gap-2 rounded-[10px] bg-[#f1f1f1] text-[15px] font-semibold"
      >
        <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#84898f] text-white">
          <Type size={17} strokeWidth={2.25} />
        </span>
        Add Text
      </button>

      <div className="pt-1">
        <p className="text-[15px] font-semibold">Upload a Picture</p>
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDropUpload}
          className="mt-2 flex h-[82px] w-full cursor-pointer items-center gap-4 rounded-[10px] border border-dashed border-[#ff661e] px-6"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center text-[#8c8c8c]">
            <Upload size={34} strokeWidth={2.2} />
          </span>
          <span className="block text-[15px] font-semibold">
            <span className="underline">Choose a file</span> or drag and drop it here
            <br />
            <span className="text-[13px] text-[#8c8c8c]">JPEG or PNG formats, up to 3MB</span>
          </span>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" onChange={onUpload} className="hidden" />
        </label>
      </div>

      <ActionButtons mobile onRestart={onRestart} onSubmit={onSubmit} onSave={onSave} />
    </div>
  );
}
