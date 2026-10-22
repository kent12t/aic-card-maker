import type { TabLabel } from "./types";

export const CARD_ASPECT_RATIO = 64 / 53;
export const BOARD_WIDTH = 443;
export const BOARD_HEIGHT = BOARD_WIDTH / CARD_ASPECT_RATIO;
export const CARD_EXPORT_WIDTH = 800;
export const CARD_EXPORT_HEIGHT = Math.round(CARD_EXPORT_WIDTH / CARD_ASPECT_RATIO);

export const TAB_LABELS: TabLabel[] = [
  { key: "frames", label: "Frames" },
  { key: "persons", label: "CCPs" },
  { key: "messages", label: "Messages" },
  { key: "stickers", label: "Stickers" },
];

export const frameSources = Array.from({ length: 6 }, (_, i) => `/assets/frames/frame_${i + 1}.webp`);
export const messageSources = Array.from({ length: 15 }, (_, i) => `/assets/messages/msg_${i + 1}.webp`);
export const stickerSources = Array.from({ length: 15 }, (_, i) => `/assets/stickers/sticker_${i + 1}.webp`);
export const personSources = Array.from({ length: 11 }, (_, i) => `/assets/persons/ccp_${i + 1}.webp`);
