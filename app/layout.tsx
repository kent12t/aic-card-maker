import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { PageTransitionProvider } from "@/components/navigation/PageTransition";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});

export const metadata: Metadata = {
  title: "Community Care Day Card Maker",
  description: "Drag and drop sticker card maker",
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
      </body>
    </html>
  );
}
