"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useState } from "react";
import styles from "@/app/page.module.css";

const cards = [
  { image: "card_kv1.webp", description: "Gwen Neo, Music Therapist at Ren Ci Hospital, sharing a joyful moment with a senior." },
  { image: "card_kv2.webp", description: "R. Subramaniam, Senior Staff Nurse at Methodist Welfare Services, caring for a senior." },
  { image: "card_kv3.webp", description: "Aishah Yunus, Assistant Manager, Case Management at Thye Hua Kwan Moral Charities, supporting seniors." },
];

export function CardDeck() {
  const [paused, setPaused] = useState(false);

  return (
    <section className={styles.deckSection} aria-label="Celebrating our community care workers">
      <div className={`${styles.deck} ${paused ? styles.paused : ""}`}>
        {cards.map((card, index) => (
          <div key={card.image} className={`${styles.card} ${styles[`card${index + 1}`]}`}>
            <Image
              src={`/assets/misc/${card.image}`}
              alt={card.description}
              fill
              sizes="(max-width: 767px) 90vw, (max-width: 1100px) 70vw, 48vw"
              priority
              className={styles.cardImage}
              draggable={false}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className={styles.animationControl}
        onClick={() => setPaused((value) => !value)}
        aria-label={paused ? "Play card animation" : "Pause card animation"}
        aria-pressed={paused}
      >
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>
    </section>
  );
}
