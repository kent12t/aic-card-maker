import { CardWall } from "@/components/display/CardWall";
import Link from "next/link";
import landingStyles from "@/app/page.module.css";
import styles from "./page.module.css";

export default async function DisplayPage({ searchParams }: { searchParams: Promise<{ event?: string; card?: string }> }) {
  const params = await searchParams;
  const eventMode = params.event === "true";
  return <>
    <CardWall spotlightCardId={eventMode ? undefined : params.card} />
    {!eventMode && (
      <div className={styles.createAction}>
        <a href="https://www.aic.sg/CCD2026" target="_blank" rel="noopener noreferrer" className={`${landingStyles.button} ${landingStyles.primaryButton} ${styles.createButton}`}>Discover Community Care Day</a>
        <Link href="/" className={`${landingStyles.button} ${landingStyles.secondaryButton} ${styles.backButton}`}>Back</Link>
      </div>
    )}
  </>;
}
