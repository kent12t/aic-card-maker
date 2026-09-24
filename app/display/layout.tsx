import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ConvexClientProvider } from "@/components/display/ConvexClientProvider";

export const metadata: Metadata = {
  title: "Community Care Day Display Wall",
};

export default function DisplayLayout({ children }: { children: ReactNode }) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
