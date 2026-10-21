import type { CSSProperties } from "react";
import styles from "@/app/display/page.module.css";

const COLORS = ["var(--color-orange)", "var(--color-light-yellow)", "var(--color-light-violet)", "var(--color-dark-orange)", "#fff"];

/** Deterministic particles keep server/client rendering identical and replays consistent. */
export function ArrivalConfetti() {
  return (
    <div className={styles.confetti} aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const spread = ((i * 7) % 19) / 19;
        const style = {
          "--particle-color": COLORS[i % COLORS.length],
          "--burst-x": `${side * (45 + spread * 140)}px`,
          "--burst-y": `${-65 - ((i * 31) % 140)}px`,
          "--drift-x": `${side * (65 + spread * 190)}px`,
          "--fall-y": `${90 + ((i * 23) % 150)}px`,
          "--spin": `${side * (180 + ((i * 47) % 540))}deg`,
          "--delay": `${650 + ((i * 37) % 220)}ms`,
          "--duration": `${1700 + ((i * 53) % 700)}ms`,
          left: side === -1 ? "10%" : "90%",
          top: `${32 + ((i * 13) % 25)}%`,
        } as CSSProperties;
        return (
          <span key={i} className={styles.confettiFlight} style={style}>
            <span className={`${styles.confettiPiece} ${i % 3 === 0 ? styles.confettiDot : ""}`} />
          </span>
        );
      })}
    </div>
  );
}
