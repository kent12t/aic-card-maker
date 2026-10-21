"use client";

import { QRCodeSVG } from "qrcode.react";
import { Modal } from "@/components/Modal";

type StatusNoticeProps = {
  open: boolean;
  title: string;
  message: string;
  linkHref?: string;
  qrUrl?: string;
  onDownload?: () => void;
  onConfirm?: () => void;
  onClose: () => void;
};

export function StatusNotice({ open, title, message, linkHref, qrUrl, onDownload, onConfirm, onClose }: StatusNoticeProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="status-notice-title" className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%_-_32px)] max-w-md overflow-auto rounded-2xl border-0 bg-white p-0 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
      <div className="p-5">
        <p id="status-notice-title" className="font-open-sans text-[18px] font-bold text-[#ff661e]">
          {title}
        </p>
        <p className="mt-2 whitespace-pre-line text-[15px] font-semibold leading-snug text-[#1c1815]">
          {message}
          {onDownload && <> <button type="button" onClick={onDownload} className="not-italic text-[#6b3b9c] underline">Download</button> it to save it as a keepsake.</>}
          {linkHref && <><br />Now click <a href={linkHref} className="not-italic text-[#6b3b9c] underline">here</a> to view.</>}
        </p>
        {qrUrl && (
          <a href={qrUrl} target="_blank" rel="noopener noreferrer" aria-label="Open your card image" className="mx-auto mt-4 block w-fit rounded-xl bg-white p-4">
            <QRCodeSVG value={qrUrl} size={224} level="M" marginSize={4} />
          </a>
        )}
        <div className="mt-4 flex justify-end gap-2">
          {onConfirm && (
            <button type="button" onClick={onConfirm} className="rounded-xl bg-[#ff661e] px-4 py-2 text-sm font-bold text-white">
              Yes
            </button>
          )}
          <button type="button" onClick={onClose} className="rounded-xl bg-[#ff661e] px-4 py-2 text-sm font-bold text-white">
            {onConfirm ? "Cancel" : "OK"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
