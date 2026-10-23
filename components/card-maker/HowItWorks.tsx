"use client";

import { CircleHelp, X } from "lucide-react";
import Image from "next/image";
import { Fragment, useState } from "react";
import { Modal } from "@/components/Modal";
import { usePageTransition } from "@/components/navigation/PageTransition";
import styles from "@/app/design/page.module.css";

const steps = [
  { icon: "icon_howto_pencil.webp", width: 151, height: 129, lines: ["Choose a frame"] },
  { icon: "icon_howto_avatar.webp", width: 219, height: 123, lines: ["Select your favourite", "Community Care", "Professional (CCP)"] },
  { icon: "icon_howto_messages.webp", width: 166, height: 124, lines: ["Pick an appreciation", "message and personalise", "your card with", "decorative stickers"], desktopLines: ["Pick an appreciation message and personalise", "your card with decorative stickers"] },
  { icon: "icon_howto_submit.webp", width: 140, height: 138, lines: ["Submit your card"] },
];

export function HowItWorks() {
  const [open, setOpen] = useState(true);
  const { isTransitioning } = usePageTransition();

  return (
    <div className={styles.help}>
      <button type="button" className={styles.helpButton} onClick={() => setOpen(true)}>
        <CircleHelp aria-hidden="true" /> How it works
      </button>
      <Modal open={open && !isTransitioning} onClose={() => setOpen(false)} className={styles.helpDialog} labelledBy="how-it-works-title">
        <div className={styles.helpContent}>
          <button type="button" className={styles.closeHelp} aria-label="Close instructions" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
          <h2 id="how-it-works-title">Create your card in<br className={styles.mobileHelpBreak} /> a few easy steps:</h2>
          <ol className={styles.helpSteps}>
            {steps.map((step, index) => (
              <li key={step.icon}>
                <div className={styles.helpStepRow}>
                  <span className={styles.helpStepNumber} aria-hidden="true"><span>{index + 1}</span></span>
                  <span className={styles.helpStepLabel}>
                    <span className={styles.desktopHelpLabel}>
                      {(step.desktopLines ?? [step.lines.join(" ")]).map((line, lineIndex) => (
                        <Fragment key={line}>
                          {lineIndex > 0 && <> <br /></>}
                          {line}
                        </Fragment>
                      ))}
                    </span>
                    <span className={styles.mobileHelpLabel}>
                    {step.lines.map((line, lineIndex) => (
                      <Fragment key={line}>
                        {lineIndex > 0 && <> <br className={styles.mobileHelpBreak} /></>}
                        {line}
                      </Fragment>
                    ))}
                    </span>
                  </span>
                  <span className={styles.helpStepArtwork}>
                    <Image src={`/assets/misc/${step.icon}`} alt="" width={step.width} height={step.height} className={styles.helpStepIcon} />
                  </span>
                </div>
                {index < steps.length - 1 && <span className={styles.helpStepArrow}><Image src="/assets/misc/arrow_down.webp" alt="" width={30} height={109} className={styles.helpConnector} /></span>}
              </li>
            ))}
          </ol>
          <button type="button" className={styles.startButton} onClick={() => setOpen(false)}>Let’s start</button>
        </div>
      </Modal>
    </div>
  );
}
