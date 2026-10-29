"use client";

import Link from "next/link";
import { EventLink, withEventMode } from "./EventLink";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

type TransitionContextValue = {
  isTransitioning: boolean;
  navigate: (href: string) => boolean;
  onReady: () => void;
};

const TransitionContext = createContext<TransitionContextValue>({
  isTransitioning: false,
  navigate: () => false,
  onReady: () => {},
});

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const activeRef = useRef(false);
  const readyRef = useRef<(() => void) | null>(null);

  const onReady = useCallback(() => readyRef.current?.(), []);

  function navigate(href: string) {
    href = withEventMode(href, new URLSearchParams(window.location.search).get("event") === "true");
    const destination = new URL(href, window.location.href);
    const isPagePair = (pathname === "/" && destination.pathname === "/design")
      || (pathname === "/design" && destination.pathname === "/");

    if (!isPagePair || !document.startViewTransition
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (activeRef.current) return true;

    activeRef.current = true;
    setIsTransitioning(true);
    document.documentElement.dataset.pageTransition = destination.pathname === "/design" ? "to-design" : "to-home";

    let timeout: ReturnType<typeof setTimeout>;
    const transition = document.startViewTransition(() => new Promise<void>((resolve) => {
      readyRef.current = resolve;
      // A slow or failed route must never leave a frozen, non-interactive page.
      timeout = setTimeout(() => {
        transition.skipTransition();
        resolve();
      }, 2500);
      router.push(href);
    }));

    const finish = () => {
      clearTimeout(timeout);
      readyRef.current = null;
      activeRef.current = false;
      delete document.documentElement.dataset.pageTransition;
      setIsTransitioning(false);
    };
    void transition.finished.then(finish, finish);
    // Skipped transitions can reject `ready`; navigation should still complete.
    void transition.ready.catch(() => {});
    return true;
  }

  return (
    <TransitionContext.Provider value={{ isTransitioning, navigate, onReady }}>
      {children}
    </TransitionContext.Provider>
  );
}

export function TransitionLink({ href, onNavigate, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { navigate } = useContext(TransitionContext);
  return <EventLink {...props} href={href} onNavigate={(event) => {
    let prevented = false;
    onNavigate?.({ preventDefault: () => { prevented = true; event.preventDefault(); } });
    if (prevented) return;
    if (navigate(href)) event.preventDefault();
  }} />;
}

// Signal from the actual page, rather than a route change that may still be
// showing a Suspense fallback. Decode the frame before taking the new snapshot.
// Do not await animation frames here: view transitions suspend rendering while
// their update callback is pending.
export function PageTransitionReady({ imageSrc }: { imageSrc?: string }) {
  const { onReady } = useContext(TransitionContext);
  useEffect(() => {
    let cancelled = false;
    async function ready() {
      if (imageSrc) {
        const image = new window.Image();
        image.src = imageSrc;
        await image.decode().catch(() => {});
      }
      if (cancelled) return;
      onReady();
    }
    void ready();
    return () => { cancelled = true; };
  }, [imageSrc, onReady]);
  return null;
}

export function usePageTransition() {
  return useContext(TransitionContext);
}
