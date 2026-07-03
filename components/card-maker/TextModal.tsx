"use client";

import { COLORS, FONT_BUTTONS } from "@/lib/card-maker/constants";
import type { FontKey } from "@/lib/card-maker/types";

type TextModalProps = {
  open: boolean;
  value: string;
  font: FontKey;
  color: string;
  onValueChange: (value: string) => void;
  onFontChange: (font: FontKey) => void;
  onColorChange: (color: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function TextModal({
  open,
  value,
  font,
  color,
  onValueChange,
  onFontChange,
  onColorChange,
  onCancel,
  onSubmit,
}: TextModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/35 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <p className="text-[18px] font-semibold text-[#1c1815]">Enter your thank you message:</p>
        <textarea
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          rows={4}
          maxLength={500}
          autoFocus
          className="mt-3 w-full resize-none rounded-xl border border-[#dbdbdb] px-3 py-2 text-[15px] outline-none focus:border-[#ff661e]"
          placeholder="Type your message"
        />
        <p className="mt-1 text-right text-xs text-[#8c8c8c]">{value.length}/500</p>
        <div className="mt-3 flex flex-wrap gap-[5px] lg:hidden">
          {FONT_BUTTONS.map((fontItem) => {
            const selected = font === fontItem.key;
            return (
              <button
                type="button"
                key={fontItem.key}
                onClick={() => onFontChange(fontItem.key)}
                className={`flex h-[26px] w-[62px] items-center justify-center rounded-[10px] ${selected ? "bg-[#ffdd7e]" : "bg-white"}`}
              >
                <span className={`${fontItem.className} ${fontItem.baselineClass} text-[18px] leading-none`}>{fontItem.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-6 gap-[5px] lg:hidden">
          {COLORS.map((colorValue) => {
            const selected = color === colorValue;
            return (
              <button
                type="button"
                key={colorValue}
                onClick={() => onColorChange(colorValue)}
                className="h-[37px] w-[37px] rounded-[9px] border"
                style={{
                  background: colorValue,
                  borderColor: selected ? "#000" : "#dbdbdb",
                  borderWidth: selected ? 2 : 1,
                }}
              />
            );
          })}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-xl bg-[#f1f1f1] px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} className="rounded-xl bg-[#ff661e] px-4 py-2 text-sm font-bold text-white">
            Add Text
          </button>
        </div>
      </div>
    </div>
  );
}
