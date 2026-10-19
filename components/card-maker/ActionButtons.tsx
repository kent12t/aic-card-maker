"use client";

type ActionButtonsProps = {
  mobile?: boolean;
  isSubmitting?: boolean;
  isExporting?: boolean;
  onRestart: () => void;
  onSubmit: () => void;
  onSave: () => void;
  onShare?: () => void;
};

export function ActionButtons({ mobile = false, isSubmitting = false, isExporting = false, onRestart, onSubmit, onSave, onShare }: ActionButtonsProps) {
  const busy = isSubmitting || isExporting;
  const secondaryClass = "min-h-[44px] flex-1 rounded-[12px] bg-[#f1f1f1] px-2 py-2 text-[16px] font-semibold shadow-[0_4px_4px_rgba(0,0,0,0.25)] disabled:cursor-wait disabled:opacity-60 lg:min-h-[50px]";
  return (
    <div className={mobile ? "flex w-full flex-wrap items-start gap-2 pt-2" : "hidden w-full flex-wrap gap-3 lg:flex"}>
      <button type="button" onClick={onRestart} disabled={busy} className={secondaryClass}>Restart</button>
      <button type="button" onClick={onSubmit} disabled={busy} aria-busy={isSubmitting} className={`${secondaryClass} !bg-[#ff661e] font-bold text-white`}>
        {isSubmitting ? "Submitting…" : "Submit"}
      </button>
      <button type="button" onClick={onSave} disabled={busy} aria-busy={isExporting} className={secondaryClass}>Download</button>
      {onShare && <button type="button" onClick={onShare} disabled={busy} className={secondaryClass}>Share</button>}
    </div>
  );
}
