"use client";

import { Upload } from "lucide-react";
import type { ChangeEvent, DragEvent, RefObject } from "react";

type UploadDropzoneProps = {
  fileInputRef: RefObject<HTMLInputElement>;
  onDropUpload: (event: DragEvent<HTMLLabelElement>) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
};

export function UploadDropzone({ fileInputRef, onDropUpload, onUpload, className = "" }: UploadDropzoneProps) {
  return (
    <div className={className}>
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
  );
}
