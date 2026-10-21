import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConvexClientProvider } from "@/components/display/ConvexClientProvider";
import { circular } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Thank You Wall | Community Care Day",
};

export default function DisplayLayout({ children }: { children: ReactNode }) {
  return <ConvexClientProvider><div className={circular.variable}>{children}</div></ConvexClientProvider>;
}
