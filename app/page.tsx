import Image from "next/image";
import { EventLink as Link } from "@/components/navigation/EventLink";
import { CardDeck } from "@/components/landing/CardDeck";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { PageTransitionReady, TransitionLink } from "@/components/navigation/PageTransition";
import { circular, caslon } from "@/lib/fonts";
import styles from "./page.module.css";

const steps = [
  { label: "Personalise", icon: "icon_pencil.webp", width: 215, height: 184 },
  { label: "Submit", icon: "icon_submit.webp", width: 180, height: 177 },
  { label: "Share", icon: "icon_share.webp", width: 178, height: 162 },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const eventMode = (await searchParams).event === "true";
  const designHref = eventMode ? "/design?event=true" : "/design";

  return (
    <div className={`${styles.landing} ${circular.variable} ${caslon.variable}`}>
      <PageTransitionReady />
      <SiteHeader />

      <main className={styles.hero}>
        <section className={styles.content} aria-labelledby="landing-title">
          <h1 id="landing-title" className={styles.heading}>
            <span>Say Thank You</span>
            <span>to the people</span>
            <span>who care</span>
          </h1>

          <ol className={styles.steps} aria-label="Three simple steps">
            {steps.map((step, index) => (
              <li key={step.label} className={styles.step}>
                <div className={styles.stepContent}>
                  <Image src={`/assets/misc/${step.icon}`} alt="" width={step.width} height={step.height} className={styles.stepIcon} />
                  <span>{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <span className={styles.stepArrowSlot}>
                    <Image src={`/assets/misc/${index === 0 ? "arrow_short.webp" : "arrow_long.webp"}`} alt="" width={index === 0 ? 104 : 153} height={35} className={styles.stepArrow} />
                  </span>
                )}
              </li>
            ))}
          </ol>

          <div className={styles.actions}>
            <TransitionLink href={designHref} className={`${styles.button} ${styles.primaryButton}`}>
              Create &apos;Thank You&apos; card
            </TransitionLink>
            <Link href="/display" className={`${styles.button} ${styles.secondaryButton}`}>
              View the &apos;Thank You&apos; Wall
            </Link>
          </div>
        </section>

        <CardDeck />
      </main>
    </div>
  );
}
