import localFont from "next/font/local";

export const circular = localFont({
  src: [
    { path: "../public/assets/fonts/CircularStd-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/assets/fonts/CircularStd-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-circular",
  display: "swap",
});

export const caslon = localFont({
  src: [
    { path: "../public/assets/fonts/CaslonDoric-RegularNo2.otf", weight: "400", style: "normal" },
    { path: "../public/assets/fonts/CaslonDoric-RegularNo2Italic.otf", weight: "400", style: "italic" },
  ],
  variable: "--font-caslon",
  display: "swap",
});
