"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import styles from "@/app/page.module.css";

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    function handleFocusOut(event: FocusEvent) {
      if (!navRef.current?.contains(event.relatedTarget as Node)) setOpen(false);
    }

    const nav = navRef.current;
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    nav?.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      nav?.removeEventListener("focusout", handleFocusOut);
    };
  }, [open]);

  return (
    <nav ref={navRef} className={styles.nav} aria-label="Main navigation">
      <button
        ref={toggleRef}
        type="button"
        className={styles.menuToggle}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls="landing-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
      </button>
      <div id="landing-navigation" className={`${styles.navLinks} ${open ? styles.navOpen : ""}`}>
        <Link href="/display" onClick={() => setOpen(false)}>Thank You Wall</Link>
        <a href="https://for.sg/ccd26" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
          CCD Day
        </a>
      </div>
    </nav>
  );
}
