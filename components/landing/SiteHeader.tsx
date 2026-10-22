import Image from "next/image";
import { TransitionLink } from "@/components/navigation/PageTransition";
import { LandingNav } from "./LandingNav";
import styles from "@/app/page.module.css";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`${styles.header} ${compact ? styles.compactHeader : ""}`}>
      <div className={styles.logos}>
        <TransitionLink href="/" aria-label="Community Care Day home">
        <Image className={styles.aicLogo} src="/assets/misc/aic_logo.svg" alt="Agency for Integrated Care" width={249} height={179} priority />
        </TransitionLink>
        <a href="https://www.aic.sg/ccd2026" target="_blank" rel="noopener noreferrer">
        <Image className={styles.ccdLogo} src="/assets/misc/ccd-logo.svg" alt="Community Care Day" width={681} height={215} priority />
        </a>
      </div>
      <LandingNav />
    </header>
  );
}
