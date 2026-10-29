"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

export function withEventMode(href: string, eventMode: boolean) {
  if (!eventMode || !href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "https://local.invalid");
  url.searchParams.set("event", "true");
  return `${url.pathname}${url.search}${url.hash}`;
}

function ResolvedEventLink({ href, ...props }: Props) {
  const eventMode = useSearchParams().get("event") === "true";
  return <Link {...props} href={withEventMode(href, eventMode)} />;
}

// Keep static routes renderable while resolving the current query on the client.
export function EventLink(props: Props) {
  return <Suspense fallback={<Link {...props} />}><ResolvedEventLink {...props} /></Suspense>;
}
