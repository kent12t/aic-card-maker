export type TabKey = "frames" | "messages" | "stickers" | "persons";

export type FontKey = "open" | "circular" | "caveat" | "kalam";

export type TargetType = "sticker" | "text";

export type InteractionMode = "move" | "rotate" | "resize";

export type StickerItem = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  zIndex: number;
};

export type TextItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  font: FontKey;
  fontSize: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  zIndex: number;
};

export type DragPayload = {
  src: string;
  width: number;
  height: number;
};

export type SelectedTarget = {
  type: TargetType;
  id: string;
} | null;

export type InteractionState = {
  mode: InteractionMode;
  target: SelectedTarget;
  startPointerX: number;
  startPointerY: number;
  startX: number;
  startY: number;
  startRotation: number;
  startScale: number;
  centerX: number;
  centerY: number;
  startPointerAngle: number;
  startPointerDistance: number;
};

export type TabLabel = {
  key: TabKey;
  label: string;
};

export type FontButton = {
  key: FontKey;
  label: string;
  className: string;
  baselineClass: string;
};

export type PaletteItem = {
  src: string;
  width: number;
  height: number;
  frame: boolean;
};
