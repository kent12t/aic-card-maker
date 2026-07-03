import { BOARD_SIZE, TEXT_MAX_RENDER_HEIGHT, TEXT_MAX_RENDER_WIDTH } from "@/lib/card-maker/constants";
import type { FontKey } from "@/lib/card-maker/types";

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getBoundsForScale(width: number, height: number, scale: number, overflowRatio = 0) {
  const extraX = (width * scale - width) / 2;
  const extraY = (height * scale - height) / 2;
  const overflowX = BOARD_SIZE * overflowRatio;
  const overflowY = BOARD_SIZE * overflowRatio;
  const minX = extraX - overflowX;
  const maxX = BOARD_SIZE - width - extraX + overflowX;
  const minY = extraY - overflowY;
  const maxY = BOARD_SIZE - height - extraY + overflowY;

  return {
    minX: minX <= maxX ? minX : (BOARD_SIZE - width) / 2,
    maxX: minX <= maxX ? maxX : (BOARD_SIZE - width) / 2,
    minY: minY <= maxY ? minY : (BOARD_SIZE - height) / 2,
    maxY: minY <= maxY ? maxY : (BOARD_SIZE - height) / 2,
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

export function getFontClass(font: FontKey) {
  if (font === "open") return "font-circular";
  if (font === "circular") return "font-glass";
  if (font === "caveat") return "font-shadows";
  return "font-caveat";
}

export function normalizeTextInput(input: string) {
  const source = input.replace(/\r\n/g, "\n").slice(0, 500);
  if (!source) return "";

  const maxCharsPerLine = 28;

  function wrapLine(line: string) {
    const compact = line.replace(/\s+/g, " ").trim();
    if (!compact) return [""];

    const words = compact.split(" ");
    const wrapped: string[] = [];
    let current = "";

    for (const word of words) {
      if (!current.length) {
        if (word.length <= maxCharsPerLine) {
          current = word;
        } else {
          for (let i = 0; i < word.length; i += maxCharsPerLine) {
            wrapped.push(word.slice(i, i + maxCharsPerLine));
          }
        }
        continue;
      }

      const candidate = `${current} ${word}`;
      if (candidate.length <= maxCharsPerLine) {
        current = candidate;
        continue;
      }

      wrapped.push(current);
      if (word.length <= maxCharsPerLine) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += maxCharsPerLine) {
          wrapped.push(word.slice(i, i + maxCharsPerLine));
        }
        current = "";
      }
    }

    if (current.length) wrapped.push(current);
    return wrapped;
  }

  const lines = source
    .split("\n")
    .flatMap((line) => wrapLine(line))
    .map((line) => line.trimEnd());
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines.join("\n");
}

export function measureTextBox(text: string, fontSize: number) {
  const lines = text.split("\n");
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return {
    width: Math.max(36, Math.round(longest * fontSize * 0.54 + 8)),
    height: Math.max(24, Math.round(lines.length * fontSize * 1.02 + 6)),
  };
}

export function getTextMaxScale(width: number, height: number) {
  const maxByWidth = TEXT_MAX_RENDER_WIDTH / Math.max(1, width);
  const maxByHeight = TEXT_MAX_RENDER_HEIGHT / Math.max(1, height);
  return Math.max(0.4, Math.min(maxByWidth, maxByHeight, 8));
}
