"use client";

import Image from "next/image";
import { useRef } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { TAB_LABELS } from "@/lib/card-maker/constants";
import type { DragPayload, PaletteItem, TabKey } from "@/lib/card-maker/types";
import styles from "@/app/design/page.module.css";

type PalettePanelProps = {
  activeTab: TabKey;
  paletteItems: PaletteItem[];
  selectedFrame: string;
  onSelectTab: (tab: TabKey) => void;
  onSelectFrame: (src: string) => void;
  onAddSticker: (payload: DragPayload) => void;
  onDragStartItem: (event: DragEvent<HTMLButtonElement>, payload: DragPayload) => void;
};

export function PalettePanel({ activeTab, paletteItems, selectedFrame, onSelectTab, onSelectFrame, onAddSticker, onDragStartItem }: PalettePanelProps) {
  const tabsRef = useRef<HTMLDivElement>(null);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % TAB_LABELS.length;
    else if (event.key === "ArrowLeft") nextIndex = (index + TAB_LABELS.length - 1) % TAB_LABELS.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = TAB_LABELS.length - 1;
    else return;
    event.preventDefault();
    onSelectTab(TAB_LABELS[nextIndex].key);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex].focus();
  }

  return (
    <div className={styles.palette}>
      <div ref={tabsRef} className={styles.tabs} role="tablist" aria-label="Card elements">
        {TAB_LABELS.map((tab, index) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls="card-palette"
            tabIndex={activeTab === tab.key ? 0 : -1}
            className={styles.tab}
            onClick={() => onSelectTab(tab.key)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div key={activeTab} id="card-palette" role="tabpanel" aria-labelledby={`tab-${activeTab}`} tabIndex={0} className={styles.paletteScroll}>
        <div className={styles.paletteGrid} data-category={activeTab}>
          {paletteItems.map((item, index) => (
            <button
              key={item.src}
              type="button"
              className={`${styles.paletteItem} ${item.frame ? styles.frameItem : ""}`}
              aria-label={item.frame ? `Select frame ${index + 1}` : `Add ${activeTab === "persons" ? "CCP sticker" : activeTab === "messages" ? "message" : "sticker"} ${index + 1}`}
              aria-pressed={item.frame ? selectedFrame === item.src : undefined}
              draggable={!item.frame}
              onClick={() => item.frame ? onSelectFrame(item.src) : onAddSticker(item)}
              onDragStart={(event) => onDragStartItem(event, item)}
            >
              <Image src={item.src} alt="" fill sizes="(max-width: 600px) 100px, (max-width: 1100px) 150px, 160px" className={styles.paletteImage} unoptimized priority={index < 3} draggable={false} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
