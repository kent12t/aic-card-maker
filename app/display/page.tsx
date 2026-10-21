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
        <Link href="/design" className={`${landingStyles.button} ${landingStyles.primaryButton} ${styles.createButton}`}>Create your thank you card</Link>
      </div>
    )}
  </>;
}
