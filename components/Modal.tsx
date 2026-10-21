"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
};

export function Modal({ open, onClose, labelledBy, className, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Keep the last open panel intact when its parent clears the notice data.
  // Updating during render avoids a blank frame before the exit animation.
  const [retainedChildren, setRetainedChildren] = useState<ReactNode>(null);
  if (open && retainedChildren !== children) setRetainedChildren(children);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let cancelled = false;

    if (open) {
      dialog.dataset.modalState = "open";
      if (!dialog.open) {
        dialog.showModal();
        dialog.focus({ preventScroll: true });
      }
    } else if (dialog.open) {
      dialog.dataset.modalState = "closing";
      const finish = () => {
        if (cancelled) return;
        dialog.close();
        setRetainedChildren(null);
      };
      // Read the CSS animations rather than duplicating their timing in JS.
      // With reduced motion (or no animation support), close immediately.
      const animations = dialog.getAnimations();
      if (animations.length) {
        void Promise.allSettled(animations.map((animation) => animation.finished)).then(finish);
      } else {
        finish();
      }
    }
    return () => { cancelled = true; };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={className}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        if (open) onClose();
      }}
      onKeyDown={(event) => {
        // Handle Escape before the browser's close request so the exit also
        // works when a native cancel event is not cancelable.
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          if (open) onClose();
        }
      }}
      onClose={(event) => {
        if (event.currentTarget.open) return;
        setRetainedChildren(null);
        if (open) onClose();
      }}
      onClick={(event) => {
        if (!open) return;
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}
    >
      {open ? children : retainedChildren}
    </dialog>
  );
}
