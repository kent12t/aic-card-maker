import { BOARD_HEIGHT, BOARD_WIDTH } from "@/lib/card-maker/constants";

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getBoundsForScale(width: number, height: number, scale: number, overflowRatio = 0) {
  const extraX = (width * scale - width) / 2;
  const extraY = (height * scale - height) / 2;
  const overflowX = BOARD_WIDTH * overflowRatio;
  const overflowY = BOARD_HEIGHT * overflowRatio;
  const minX = extraX - overflowX;
  const maxX = BOARD_WIDTH - width - extraX + overflowX;
  const minY = extraY - overflowY;
  const maxY = BOARD_HEIGHT - height - extraY + overflowY;

  return {
    minX: minX <= maxX ? minX : (BOARD_WIDTH - width) / 2,
    maxX: minX <= maxX ? maxX : (BOARD_WIDTH - width) / 2,
    minY: minY <= maxY ? minY : (BOARD_HEIGHT - height) / 2,
    maxY: minY <= maxY ? maxY : (BOARD_HEIGHT - height) / 2,
  };
}

export function clampPositionForScale(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  overflowRatio = 0,
) {
  const bounds = getBoundsForScale(width, height, scale, overflowRatio);
  return {
    x: clamp(x, bounds.minX, bounds.maxX),
    y: clamp(y, bounds.minY, bounds.maxY),
  };
}

export function getHandleStyle(scale: number) {
  const naturalSize = 24 * scale;
  const clampedSize = clamp(naturalSize, 16, 30);
  const ratio = clampedSize / Math.max(0.001, naturalSize);
  return {
    transform: `scale(${ratio})`,
    transformOrigin: "center",
  } as const;
}
