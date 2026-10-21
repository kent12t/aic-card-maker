import type { FontButton, TabLabel } from "./types";

export const CARD_ASPECT_RATIO = 64 / 53;
export const BOARD_WIDTH = 443;
export const BOARD_HEIGHT = BOARD_WIDTH / CARD_ASPECT_RATIO;
export const CARD_EXPORT_WIDTH = 800;
export const CARD_EXPORT_HEIGHT = Math.round(CARD_EXPORT_WIDTH / CARD_ASPECT_RATIO);
export const TEXT_MAX_RENDER_WIDTH = 390;
export const TEXT_MAX_RENDER_HEIGHT = 320;

export const TAB_LABELS: TabLabel[] = [
  { key: "frames", label: "Frames" },
  { key: "messages", label: "Messages" },
  { key: "stickers", label: "Stickers" },
  { key: "persons", label: "CCP Stickers" },
];

export const FONT_BUTTONS: FontButton[] = [
  { key: "open", label: "Font 1", className: "font-circular font-medium text-[13pt]", baselineClass: "translate-y-[0px]" },
  { key: "circular", label: "Font 2", className: "font-glass font-normal text-[14.5pt]", baselineClass: "translate-y-[0px]" },
  { key: "caveat", label: "Font 3", className: "font-shadows font-normal text-[14pt]", baselineClass: "translate-y-[-1px]" },
  { key: "kalam", label: "Font 4", className: "font-caveat font-bold text-[14.5pt]", baselineClass: "translate-y-[0px]" },
];

export const COLORS = [
  "#fd6280",
  "#f16e58",
  "#f7922d",
  "#fbc52c",
  "#6a9b31",
  "#76bbb4",
  "#1a8ca1",
  "#6277b7",
  "#b492c8",
  "#6b3b9c",
  "#1c1815",
  "#fbf2e6",
];

export const frameSources = Array.from({ length: 6 }, (_, i) => `/assets/frames/frame_${i + 1}.webp`);
export const messageSources = Array.from({ length: 15 }, (_, i) => `/assets/messages/msg_${i + 1}.webp`);
export const stickerSources = Array.from({ length: 15 }, (_, i) => `/assets/stickers/sticker_${i + 1}.webp`);
export const personSources = Array.from({ length: 11 }, (_, i) => `/assets/persons/ccp_${i + 1}.webp`);
