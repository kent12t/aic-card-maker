import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { PageTransitionProvider } from "@/components/navigation/PageTransition";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  title: "Create a thank you card | Community Care Day",
  description: "Create a personalised thank you card for a Community Care Professional and share it on the Thank You Wall.",
  icons: {
    icon: [{ url: "/assets/misc/ccd-logo-only.svg", type: "image/svg+xml" }],
    shortcut: "/assets/misc/ccd-logo-only.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={openSans.variable}
      >
        <PageTransitionProvider>{children}</PageTransitionProvider>
        <Analytics />
      </body>
    </html>
  );
}
