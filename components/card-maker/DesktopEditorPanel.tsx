"use client";

import type { ChangeEvent, DragEvent, RefObject } from "react";
import { IntroContent } from "@/components/card-maker/IntroContent";
import { TextFormattingControls } from "@/components/card-maker/TextFormattingControls";
import { UploadDropzone } from "@/components/card-maker/UploadDropzone";
import type { TextItem } from "@/lib/card-maker/types";

type DesktopEditorPanelProps = {
  selectedText: TextItem | null;
  fileInputRef: RefObject<HTMLInputElement>;
  onAddText: () => void;
  onUpdateSelectedText: (partial: Partial<TextItem>) => void;
  onDropUpload: (event: DragEvent<HTMLLabelElement>) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function DesktopEditorPanel({
  selectedText,
  fileInputRef,
  onAddText,
  onUpdateSelectedText,
  onDropUpload,
  onUpload,
}: DesktopEditorPanelProps) {
  return (
    <section className="hidden w-full rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.12)] lg:block lg:h-[528px] lg:w-[480px]">
      <IntroContent titleClassName="font-open-sans text-[26px] font-bold leading-none text-[#ff661e]" textClassName="text-[14px] font-semibold leading-[1.3] text-black" />
      <TextFormattingControls selectedText={selectedText} onAddText={onAddText} onUpdateText={onUpdateSelectedText} />
      <UploadDropzone fileInputRef={fileInputRef} onDropUpload={onDropUpload} onUpload={onUpload} className="mt-5" />
    </section>
  );
}
