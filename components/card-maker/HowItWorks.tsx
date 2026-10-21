"use client";

import { CircleHelp, X } from "lucide-react";
import { useRef } from "react";
import { EditorInstructions } from "./EditorInstructions";
import styles from "@/app/design/page.module.css";

export function HowItWorks() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div className={styles.help}>
      <button type="button" className={styles.helpButton} onClick={() => dialogRef.current?.showModal()}>
        <CircleHelp aria-hidden="true" /> How it works
      </button>
      <dialog ref={dialogRef} className={styles.helpDialog} aria-labelledby="how-it-works-title" onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}>
        <div className={styles.helpContent}>
          <button type="button" autoFocus className={styles.closeHelp} aria-label="Close instructions" onClick={() => dialogRef.current?.close()}><X aria-hidden="true" /></button>
          <h2 id="how-it-works-title">How it works</h2>
          <ol>
            <li>Choose a frame for your thank you card.</li>
            <li>Tap a message or sticker to add it, then drag it into place.</li>
            <li>Submit your card to the Thank You Wall, or download it to share.</li>
          </ol>
          <EditorInstructions />
        </div>
      </dialog>
    </div>
  );
}
