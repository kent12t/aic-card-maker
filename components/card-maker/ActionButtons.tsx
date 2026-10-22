"use client";

import { Download, RotateCcw, Send } from "lucide-react";
import styles from "@/app/design/page.module.css";

type ActionButtonsProps = {
  mobile?: boolean;
  isSubmitting?: boolean;
  isExporting?: boolean;
  onRestart: () => void;
  onSubmit: () => void;
  onSave: () => void;
  onShare?: () => void;
};

export function ActionButtons({ isSubmitting = false, isExporting = false, onRestart, onSubmit, onSave }: ActionButtonsProps) {
  const busy = isSubmitting || isExporting;
  return (
    <div className={styles.actions}>
      <button type="button" onClick={onRestart} disabled={busy} className={styles.actionButton}>
        Restart <RotateCcw aria-hidden="true" width={24} height={26} />
      </button>
      <button type="button" onClick={onSubmit} disabled={busy} aria-busy={isSubmitting} className={styles.actionButton}>
        {isSubmitting ? "Submitting…" : "Submit"} <Send aria-hidden="true" width={25} height={25} />
      </button>
      <button type="button" onClick={onSave} disabled={busy} aria-busy={isExporting} className={styles.actionButton}>
        Download <Download aria-hidden="true" width={26} height={26} />
      </button>
    </div>
  );
}
