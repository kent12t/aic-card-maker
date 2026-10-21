import Image from "next/image";
import Link from "next/link";
import { CardDeck } from "@/components/landing/CardDeck";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { PageTransitionReady, TransitionLink } from "@/components/navigation/PageTransition";
import { circular, caslon } from "@/lib/fonts";
import styles from "./page.module.css";

const steps = [
  { label: "Design", icon: "icon_design.svg" },
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
            <span>Say thank you</span>
            <span>to the people</span>
            <span>who care.</span>
          </h1>
          <p className={styles.description}>
            Design a card in two minutes and send it to a community care worker – a nurse,
            therapist, befriender or care staff who made a difference.
          </p>

          <ol className={styles.steps} aria-label="Three simple steps">
            {steps.map((step, index) => (
              <li key={step.label} className={styles.step}>
                <div className={styles.stepContent}>
                  <Image src={`/assets/misc/${step.icon}`} alt="" width={84} height={84} className={styles.stepIcon} />
                  <span>{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <span className={styles.stepArrow} aria-hidden="true">
                    <Image src="/assets/misc/icon_arrow.svg" alt="" fill sizes="114px" className={styles.stepArrowImage} />
                  </span>
                )}
              </li>
            ))}
          </ol>

          <div className={styles.actions}>
            <TransitionLink href={designHref} className={`${styles.button} ${styles.primaryButton}`}>
              Create your thank you card
            </TransitionLink>
            <Link href="/display" className={`${styles.button} ${styles.secondaryButton}`}>
              See the wall
            </Link>
          </div>
        </section>

        <CardDeck />
      </main>
    </div>
  );
}
