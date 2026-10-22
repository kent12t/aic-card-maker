import Image from "next/image";
import Link from "next/link";
import { DottedArrow } from "@/components/DottedArrow";
import { CardDeck } from "@/components/landing/CardDeck";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { PageTransitionReady, TransitionLink } from "@/components/navigation/PageTransition";
import { circular, caslon } from "@/lib/fonts";
import styles from "./page.module.css";

const steps = [
  { label: "Personalise", icon: "icon_design.svg" },
  { label: "Submit", icon: "icon_submit.svg" },
  { label: "Share", icon: "icon_share.svg" },
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
                  <Image src={`/assets/misc/${step.icon}`} alt="" width={84} height={84} className={styles.stepIcon} />
                  <span>{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <DottedArrow className={styles.stepArrow} />
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
