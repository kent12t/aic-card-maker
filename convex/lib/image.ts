import { CARD_EXPORT_HEIGHT, CARD_EXPORT_WIDTH } from "../../lib/card-maker/constants";

export const MAX_CARD_BYTES = 2 * 1024 * 1024;

type ImageInfo = { mimeType: "image/png" | "image/webp"; width: number; height: number };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function readPng(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 24 || !PNG_SIGNATURE.every((byte, i) => bytes[i] === byte)) return null;
  if (ascii(bytes, 12, 4) !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { mimeType: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
}

function readWebp(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  const chunk = ascii(bytes, 12, 4);

  if (chunk === "VP8X") {
    const width = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
    const height = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
    return { mimeType: "image/webp", width, height };
  }

  if (chunk === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    return { mimeType: "image/webp", width, height };
  }

  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    const width = 1 + (bytes[21] | ((bytes[22] & 0x3f) << 8));
    const height = 1 + ((bytes[22] >> 6) | (bytes[23] << 2) | ((bytes[24] & 0x0f) << 10));
    return { mimeType: "image/webp", width, height };
  }

  return null;
}

/** Reads the real format from the file bytes; the client-sent Content-Type is never trusted. */
export function validateCardImage(bytes: Uint8Array): ImageInfo | string {
  if (bytes.length === 0 || bytes.length > MAX_CARD_BYTES) return "Image must be between 1 byte and 2 MB";
  const info = readPng(bytes) ?? readWebp(bytes);
  if (!info) return "Only PNG or WebP images are allowed";
  if (info.width !== CARD_EXPORT_WIDTH || info.height !== CARD_EXPORT_HEIGHT) return `Image must be ${CARD_EXPORT_WIDTH}x${CARD_EXPORT_HEIGHT}`;
  return info;
}
