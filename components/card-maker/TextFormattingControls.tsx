"use client";

import { Type } from "lucide-react";
import { COLORS, FONT_BUTTONS } from "@/lib/card-maker/constants";
import type { FontKey, TextItem } from "@/lib/card-maker/types";

type TextFormattingControlsProps = {
  selectedText: TextItem | null;
  onAddText: () => void;
  onUpdateText: (partial: Partial<TextItem>) => void;
};

export function TextFormattingControls({ selectedText, onAddText, onUpdateText }: TextFormattingControlsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onAddText}
        className="mt-6 flex h-[42px] w-[120px] items-center justify-center gap-2 rounded-[10px] bg-[#f1f1f1] text-[15px] font-semibold"
      >
        <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#84898f] text-white">
          <Type size={17} strokeWidth={2.25} />
        </span>
        Add Text
      </button>

      <div className="mt-6 flex gap-2">
        {FONT_BUTTONS.map((font) => {
          const selected = selectedText?.font === font.key;
          return (
            <button
              type="button"
              key={font.key}
              onClick={() => onUpdateText({ font: font.key as FontKey })}
              className={`flex h-[42px] w-[100px] items-center justify-center overflow-hidden rounded-[10px] leading-none ${
                selected ? "bg-[#ffe27d]" : "bg-white"
              }`}
            >
              <span className={`${font.className} ${font.baselineClass}`}>{font.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        {COLORS.map((color) => {
          const selected = selectedText?.color === color;
          return (
            <button
              type="button"
              key={color}
              onClick={() => onUpdateText({ color })}
              className="h-[30px] w-[30px] rounded-[7px] border"
              style={{
                background: color,
                borderColor: selected ? "#000" : "#dbdbdb",
                borderWidth: selected ? 2 : 1,
              }}
            />
          );
        })}
      </div>
    </>
  );
}
