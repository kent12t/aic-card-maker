import Image from "next/image";
import Link from "next/link";
import { LandingNav } from "./LandingNav";
import styles from "@/app/page.module.css";

export function SiteHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`${styles.header} ${compact ? styles.compactHeader : ""}`}>
      <Link href="/" className={styles.logos} aria-label="Community Care Day home">
        <Image className={styles.aicLogo} src="/assets/misc/aic_logo.svg" alt="Agency for Integrated Care" width={249} height={179} priority />
        <Image className={styles.ccdLogo} src="/assets/misc/ccd-logo.svg" alt="Community Care Day" width={681} height={215} priority />
      </Link>
      <LandingNav />
    </header>
  );
}
