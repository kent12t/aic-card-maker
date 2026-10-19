"use client";

type StatusNoticeProps = {
  open: boolean;
  title: string;
  message: string;
  linkHref?: string;
  onConfirm?: () => void;
  onClose: () => void;
};

export function StatusNotice({ open, title, message, linkHref, onConfirm, onClose }: StatusNoticeProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/35 px-4" role="dialog" aria-modal="true" aria-labelledby="status-notice-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <p id="status-notice-title" className="font-open-sans text-[18px] font-bold text-[#ff661e]">
          {title}
        </p>
        <p className="mt-2 whitespace-pre-line text-[15px] font-semibold leading-snug text-[#1c1815]">
          {message}
          {linkHref && <><br />Now <a href={linkHref} className="text-[#ff661e] underline">click here</a> to view.</>}
        </p>
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
    </div>
  );
}
