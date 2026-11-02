import type { Metadata } from "next";
import { circular, caslon } from "@/lib/fonts";
import AnalyticsDashboard from "./dashboard";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Card analytics | Community Care Day",
  robots: { index: false, follow: false },
};

export default function AnalyticsPage() {
  return <main className={`${styles.page} ${circular.variable} ${caslon.variable}`}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>COMMUNITY CARE DAY · DATA EXPLORER</p>
        <h1>Card analytics</h1>
        <p>A standalone, read-only view of Convex card submissions.</p></div>
      <span className={styles.timezone}>Singapore time · UTC+8</span>
    </header>
    <AnalyticsDashboard />
  </main>;
}
