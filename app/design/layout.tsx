import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Create your thank you card | Community Care Day",
};

export default function DesignLayout({ children }: { children: ReactNode }) {
  return children;
}
