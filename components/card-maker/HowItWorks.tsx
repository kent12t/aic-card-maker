"use client";

import { CircleHelp, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import styles from "@/app/design/page.module.css";

const steps = [
  { icon: "icon_design.svg", label: "Choose a frame" },
  { icon: "icon_message.svg", label: "Select a message to say thanks" },
  { icon: "icon_avatar.svg", label: "Add avatars and stickers" },
  { icon: "icon_submit.svg", label: <>Submit your card to be<br className={styles.mobileHelpBreak} /> part<br className={styles.desktopHelpBreak} /> of the photo mosaic</> },
];

export function HowItWorks() {
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.help}>
      <button type="button" className={styles.helpButton} onClick={() => setOpen(true)}>
        <CircleHelp aria-hidden="true" /> How it works
      </button>
      <Modal open={open} onClose={() => setOpen(false)} className={styles.helpDialog} labelledBy="how-it-works-title">
        <div className={styles.helpContent}>
          <button type="button" className={styles.closeHelp} aria-label="Close instructions" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
          <h2 id="how-it-works-title">Create your card in<br className={styles.mobileHelpBreak} /> a few easy steps:</h2>
          <ol className={styles.helpSteps}>
            {steps.map((step, index) => (
              <li key={step.icon}>
                <div className={styles.helpStepRow}>
                  <span className={styles.helpStepNumber} aria-hidden="true">{index + 1}</span>
                  <Image src={`/assets/misc/${step.icon}`} alt="" width={106} height={104} className={styles.helpStepIcon} />
                  <span className={styles.helpStepLabel}>{step.label}</span>
                </div>
                {index < steps.length - 1 && <span className={styles.helpStepArrow} aria-hidden="true"><Image src="/assets/misc/icon_arrow.svg" alt="" width={70} height={9} /></span>}
              </li>
            ))}
          </ol>
          <button type="button" className={styles.startButton} onClick={() => setOpen(false)}>Let’s start</button>
        </div>
      </Modal>
    </div>
  );
}
