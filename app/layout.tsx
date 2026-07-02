import type { Metadata } from "next";
import localFont from "next/font/local";
import { Caveat, Glass_Antiqua, Kalam, Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});

const glassAntiqua = Glass_Antiqua({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-glass-antiqua",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
});

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
});

const circular = localFont({
  src: "../assets/fonts/Circular-Std-Medium.ttf",
  variable: "--font-circular",
});

export const metadata: Metadata = {
  title: "Community Care Day Card Maker",
  description: "Drag and drop sticker card maker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${openSans.variable} ${glassAntiqua.variable} ${caveat.variable} ${kalam.variable} ${circular.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
