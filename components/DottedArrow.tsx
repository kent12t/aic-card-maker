import styles from "./DottedArrow.module.css";

type DottedArrowProps = {
  className?: string;
  direction?: "right" | "down";
};

/** The dashed shaft flexes independently so the arrowhead never stretches. */
export function DottedArrow({ className = "", direction = "right" }: DottedArrowProps) {
  return (
    <span className={`${styles.arrow} ${className}`} data-direction={direction} aria-hidden="true">
      <span className={styles.shaft} />
      <svg className={styles.head} viewBox="0 0 12 14" focusable="false">
        <path d="M0 0 12 7 0 14Z" fill="currentColor" />
      </svg>
    </span>
  );
}
