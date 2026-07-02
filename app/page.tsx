"use client";

import { toPng } from "html-to-image";
import { Maximize2, Pencil, RotateCw, Type, Upload, X } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type TabKey = "frames" | "messages" | "stickers" | "persons";
type FontKey = "open" | "circular" | "caveat" | "kalam";
type TargetType = "sticker" | "text";
type InteractionMode = "move" | "rotate" | "resize";

type StickerItem = {
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

type TextItem = {
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

type DragPayload = {
  src: string;
  width: number;
  height: number;
};

type SelectedTarget = {
  type: TargetType;
  id: string;
} | null;

type InteractionState = {
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

const BOARD_SIZE = 443;
const TEXT_MAX_RENDER_WIDTH = 390;
const TEXT_MAX_RENDER_HEIGHT = 320;

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: "frames", label: "Frames" },
  { key: "messages", label: "Messages" },
  { key: "stickers", label: "Stickers" },
  { key: "persons", label: "CCP Stickers" },
];

const FONT_BUTTONS: { key: FontKey; label: string; className: string; baselineClass: string }[] = [
  { key: "open", label: "Font 1", className: "font-circular font-medium text-[13pt]", baselineClass: "translate-y-[0px]" },
  { key: "circular", label: "Font 2", className: "font-glass font-normal text-[14.5pt]", baselineClass: "translate-y-[0px]" },
  { key: "caveat", label: "Font 3", className: "font-shadows font-normal text-[14pt]", baselineClass: "translate-y-[-1px]" },
  { key: "kalam", label: "Font 4", className: "font-caveat font-bold text-[14.5pt]", baselineClass: "translate-y-[0px]" },
];

const COLORS = [
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

const frameSources = Array.from({ length: 6 }, (_, i) => `/assets/frames/frame_${i + 1}.jpg`);
const messageSources = Array.from({ length: 11 }, (_, i) => `/assets/messages/msg_${i + 1}.png`);
const stickerSources = Array.from({ length: 16 }, (_, i) => `/assets/stickers/sticker_${i + 1}.png`);
const personSources = Array.from({ length: 9 }, (_, i) => `/assets/persons/person_${i + 1}.png`);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getBoundsForScale(width: number, height: number, scale: number, overflowRatio = 0) {
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

function clampPositionForScale(
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

function getHandleStyle(scale: number) {
  const naturalSize = 24 * scale;
  const clampedSize = clamp(naturalSize, 16, 30);
  const ratio = clampedSize / Math.max(0.001, naturalSize);
  return {
    transform: `scale(${ratio})`,
    transformOrigin: "center",
  } as const;
}

function getFontClass(font: FontKey) {
  if (font === "open") return "font-circular";
  if (font === "circular") return "font-glass";
  if (font === "caveat") return "font-shadows";
  return "font-caveat";
}

function normalizeTextInput(input: string) {
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

function measureTextBox(text: string, fontSize: number) {
  const lines = text.split("\n");
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  return {
    width: Math.max(36, Math.round(longest * fontSize * 0.54 + 8)),
    height: Math.max(24, Math.round(lines.length * fontSize * 1.02 + 6)),
  };
}

function getTextMaxScale(width: number, height: number) {
  const maxByWidth = TEXT_MAX_RENDER_WIDTH / Math.max(1, width);
  const maxByHeight = TEXT_MAX_RENDER_HEIGHT / Math.max(1, height);
  return Math.max(0.4, Math.min(maxByWidth, maxByHeight, 8));
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("messages");
  const [selectedFrame, setSelectedFrame] = useState(frameSources[1]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget>(null);
  const [isCaptureMode, setIsCaptureMode] = useState(false);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [textModalValue, setTextModalValue] = useState("");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [counter, setCounter] = useState(1);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardCaptureRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const interactionRef = useRef<InteractionState | null>(null);

  const selectedText = useMemo(() => {
    if (!selectedTarget || selectedTarget.type !== "text") return null;
    return texts.find((item) => item.id === selectedTarget.id) ?? null;
  }, [texts, selectedTarget]);

  const paletteItems = useMemo(() => {
    if (activeTab === "frames") {
      return frameSources.map((src) => ({ src, width: 126, height: 126, frame: true }));
    }
    if (activeTab === "messages") {
      return messageSources.map((src) => ({ src, width: 95, height: 95, frame: false }));
    }
    if (activeTab === "stickers") {
      return stickerSources.map((src) => ({ src, width: 90, height: 90, frame: false }));
    }
    return personSources.map((src) => ({ src, width: 90, height: 130, frame: false }));
  }, [activeTab]);

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent) {
      const interaction = interactionRef.current;
      if (!interaction || !cardRef.current) return;

      const boardRect = cardRef.current.getBoundingClientRect();
      const pointerX = event.clientX - boardRect.left;
      const pointerY = event.clientY - boardRect.top;

      if (!interaction.target) return;
      const { target } = interaction;

      if (target.type === "sticker") {
        setStickers((items) =>
          items.map((item) => {
            if (item.id !== target.id) return item;

            if (interaction.mode === "move") {
              const nextX = interaction.startX + (pointerX - interaction.startPointerX);
              const nextY = interaction.startY + (pointerY - interaction.startPointerY);
              const { x, y } = clampPositionForScale(nextX, nextY, item.width, item.height, item.scale, 0.2);
              return {
                ...item,
                x,
                y,
              };
            }

            if (interaction.mode === "rotate") {
              const angle = Math.atan2(pointerY - interaction.centerY, pointerX - interaction.centerX);
              return {
                ...item,
                rotation: interaction.startRotation + ((angle - interaction.startPointerAngle) * 180) / Math.PI,
              };
            }

            const distance = Math.hypot(pointerX - interaction.centerX, pointerY - interaction.centerY);
            const scaleRatio = distance / Math.max(1, interaction.startPointerDistance);
            const nextScale = clamp(interaction.startScale * scaleRatio, 0.3, 3);
            const position = clampPositionForScale(item.x, item.y, item.width, item.height, nextScale, 0.2);
            return {
              ...item,
              scale: nextScale,
              x: position.x,
              y: position.y,
            };
          }),
        );
        return;
      }

      setTexts((items) =>
        items.map((item) => {
          if (item.id !== target.id) return item;

          if (interaction.mode === "move") {
            const nextX = interaction.startX + (pointerX - interaction.startPointerX);
            const nextY = interaction.startY + (pointerY - interaction.startPointerY);
              const { x, y } = clampPositionForScale(nextX, nextY, item.width, item.height, item.scale, 0.2);
            return {
              ...item,
              x,
              y,
            };
          }

          if (interaction.mode === "rotate") {
            const angle = Math.atan2(pointerY - interaction.centerY, pointerX - interaction.centerX);
            return {
              ...item,
              rotation: interaction.startRotation + ((angle - interaction.startPointerAngle) * 180) / Math.PI,
            };
          }

          const distance = Math.hypot(pointerX - interaction.centerX, pointerY - interaction.centerY);
          const scaleRatio = distance / Math.max(1, interaction.startPointerDistance);
          const nextScale = clamp(interaction.startScale * scaleRatio, 0.4, getTextMaxScale(item.width, item.height));
          const position = clampPositionForScale(item.x, item.y, item.width, item.height, nextScale, 0.2);
          return {
            ...item,
            scale: nextScale,
            x: position.x,
            y: position.y,
          };
        }),
      );
    }

    function handlePointerUp() {
      interactionRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  function beginInteraction(
    event: PointerEvent<HTMLElement>,
    target: SelectedTarget,
    mode: InteractionMode,
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number,
    rotation: number,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const boardRect = cardRef.current?.getBoundingClientRect();
    const pointerX = event.clientX - (boardRect?.left ?? 0);
    const pointerY = event.clientY - (boardRect?.top ?? 0);
    const centerX = x + (width * scale) / 2;
    const centerY = y + (height * scale) / 2;
    const pointerAngle = Math.atan2(pointerY - centerY, pointerX - centerX);
    const pointerDistance = Math.hypot(pointerX - centerX, pointerY - centerY);

    interactionRef.current = {
      mode,
      target,
      startPointerX: pointerX,
      startPointerY: pointerY,
      startX: x,
      startY: y,
      startRotation: rotation,
      startScale: scale,
      centerX,
      centerY,
      startPointerAngle: pointerAngle,
      startPointerDistance: pointerDistance,
    };

    setSelectedTarget(target);
  }

  function addSticker(payload: DragPayload, dropX: number, dropY: number, source: "palette" | "upload" = "palette") {
    const id = `s${counter}`;
    setCounter((value) => value + 1);

    const initialX = dropX - payload.width / 2;
    const initialY = dropY - payload.height / 2;
    const clamped = clampPositionForScale(initialX, initialY, payload.width, payload.height, 1, 0.2);

    setStickers((items) => [
      ...items,
      {
        id,
        src: payload.src,
        x: clamped.x,
        y: clamped.y,
        width: payload.width,
        height: payload.height,
        rotation: 0,
        scale: 1,
        zIndex: source === "upload" ? counter + 5 : counter + 20,
      },
    ]);

    setSelectedTarget({ type: "sticker", id });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!cardRef.current) return;

    const raw = event.dataTransfer.getData("application/card-sticker");
    if (!raw) return;

    const payload = JSON.parse(raw) as DragPayload;
    const rect = cardRef.current.getBoundingClientRect();
    addSticker(payload, event.clientX - rect.left, event.clientY - rect.top);
  }

  function updateSelectedText(partial: Partial<TextItem>) {
    if (!selectedTarget || selectedTarget.type !== "text") return;
    setTexts((items) => items.map((item) => (item.id === selectedTarget.id ? { ...item, ...partial } : item)));
  }

  function handleAddText() {
    setEditingTextId(null);
    setTextModalValue("");
    setTextModalOpen(true);
  }

  function handleEditText(target: TextItem) {
    setEditingTextId(target.id);
    setTextModalValue(target.text);
    setTextModalOpen(true);
  }

  function handleTextModalSubmit() {
    const normalized = normalizeTextInput(textModalValue);
    if (!normalized.length) {
      setTextModalOpen(false);
      setTextModalValue("");
      setEditingTextId(null);
      return;
    }

    if (!editingTextId) {
      const id = `t${counter}`;
      const fontSize = 48;
      const box = measureTextBox(normalized, fontSize / 4);
      const centered = clampPositionForScale(BOARD_SIZE / 2 - box.width / 2, BOARD_SIZE / 2 - box.height / 2, box.width, box.height, 1, 0.2);
      setCounter((value) => value + 1);
      setTexts((items) => [
        ...items,
        {
          id,
          text: normalized,
          x: centered.x,
          y: centered.y,
          color: "#6b3b9c",
          font: "open",
          fontSize,
          width: box.width,
          height: box.height,
          rotation: 0,
          scale: 1,
          zIndex: counter + 100,
        },
      ]);
      setSelectedTarget({ type: "text", id });
    } else {
      setTexts((items) =>
        items.map((item) => {
          if (item.id !== editingTextId) return item;
          const box = measureTextBox(normalized, item.fontSize / 4);
          const maxScale = getTextMaxScale(box.width, box.height);
          const nextScale = Math.min(item.scale, maxScale);
          const position = clampPositionForScale(item.x, item.y, box.width, box.height, nextScale, 0.2);
          return {
            ...item,
            text: normalized,
            width: box.width,
            height: box.height,
            scale: nextScale,
            x: position.x,
            y: position.y,
          };
        }),
      );
    }

    setTextModalOpen(false);
    setTextModalValue("");
    setEditingTextId(null);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const src = URL.createObjectURL(file);
    addSticker({ src, width: 120, height: 120 }, BOARD_SIZE / 2, BOARD_SIZE / 2, "upload");
  }

  function onDropUpload(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const src = URL.createObjectURL(file);
    addSticker({ src, width: 120, height: 120 }, BOARD_SIZE / 2, BOARD_SIZE / 2, "upload");
  }

  async function handleSave() {
    if (!cardCaptureRef.current) return;
    setIsCaptureMode(true);
    try {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
      const dataUrl = await toPng(cardCaptureRef.current, { cacheBust: true, pixelRatio: 2 });
      const anchor = document.createElement("a");
      anchor.download = "community-care-card.png";
      anchor.href = dataUrl;
      anchor.click();
    } finally {
      setIsCaptureMode(false);
    }
  }

  function handleRestart() {
    setStickers([]);
    setTexts([]);
    setSelectedTarget(null);
  }

  function handleSubmit() {
    const payload = {
      frame: selectedFrame,
      stickers: stickers.map(({ id, src, x, y, width, height, scale, rotation }) => ({
        id,
        src,
        x,
        y,
        width,
        height,
        scale,
        rotation,
      })),
      texts,
      createdAt: new Date().toISOString(),
    };

    console.info("Card submission payload", payload);
    alert("Card submitted. Hook this payload to your form endpoint.");
  }

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1595px] flex-col gap-6 lg:flex-row lg:items-start">
        <section className="w-full rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.12)] lg:h-[528px] lg:w-[480px]">
          <div className="space-y-2">
            <h1 className="font-open-sans text-[26px] font-bold leading-none text-[#ff661e]">Customise Your C.A.R.E. Card</h1>
            <p className="text-[14px] font-semibold leading-[1.3] text-black">
              Create a message of thanks with the text editor below and decorate your card with the stickers provided. You may also choose to
              upload your own picture.
            </p>
            <p className="text-[14px] font-semibold leading-[1.3] text-black">
              Once you&apos;re done, click submit and watch your card become a part of a beautiful photo mosaic celebrating Community Care
              Professionals on Community Care Day.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddText}
            className="mt-6 flex h-[42px] w-[120px] items-center justify-center gap-2 rounded-[10px] bg-[#f1f1f1] text-[15px] font-semibold"
          >
            <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#84898f] text-white">
              <Type size={17} strokeWidth={2.25} />
            </span>
            Add Text
          </button>

          <div className="mt-6 flex gap-2">
            {FONT_BUTTONS.map((font) => {
              const selected = selectedText?.font === font.key;
              return (
                <button
                  type="button"
                  key={font.key}
                  onClick={() => updateSelectedText({ font: font.key })}
                  className={`flex h-[42px] w-[100px] items-center justify-center overflow-hidden rounded-[10px] leading-none ${
                    selected ? "bg-[#ffe27d]" : "bg-white"
                  }`}
                >
                  <span className={`${font.className} ${font.baselineClass}`}>{font.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between">
            {COLORS.map((color) => {
              const selected = selectedText?.color === color;
              return (
                <button
                  type="button"
                  key={color}
                  onClick={() => updateSelectedText({ color })}
                  className="h-[30px] w-[30px] rounded-[7px] border"
                  style={{
                    background: color,
                    borderColor: selected ? "#000" : "#dbdbdb",
                    borderWidth: selected ? 2 : 1,
                  }}
                />
              );
            })}
          </div>

          <div className="mt-5">
            <p className="text-[15px] font-semibold">Upload a Picture</p>
            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDropUpload}
              className="mt-2 flex h-[82px] w-full cursor-pointer items-center gap-4 rounded-[10px] border border-dashed border-[#ff661e] px-6"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center text-[#8c8c8c]">
                <Upload size={34} strokeWidth={2.2} />
              </span>
              <span className="block text-[15px] font-semibold">
                <span className="underline">Choose a file</span> or drag and drop it here
                <br />
                <span className="text-[13px] text-[#8c8c8c]">JPEG or PNG formats, up to 3MB</span>
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>
        </section>

        <section className="flex w-full flex-col items-center gap-6 lg:w-[443px]">
          <div
            ref={cardCaptureRef}
            className="relative h-[443px] w-[443px] overflow-hidden rounded-md shadow-[-5.3px_6.2px_4.5px_rgba(0,0,0,0.22)]"
            style={{ backgroundImage: `url(${selectedFrame})`, backgroundSize: "cover", backgroundPosition: "center" }}
          >
            <div
              ref={cardRef}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              onPointerDown={() => setSelectedTarget(null)}
              className="absolute inset-0"
            >
              <div className="pointer-events-none absolute left-[23px] top-[23px] h-[397px] w-[397px] rounded-[16px] bg-[#fbf7ef]" />

              {texts
                .slice()
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((text) => {
                  const isSelected = !isCaptureMode && selectedTarget?.type === "text" && selectedTarget.id === text.id;
                  return (
                    <div
                      key={text.id}
                      className={`absolute ${isSelected ? "outline outline-1 outline-[#6ab5ff]" : ""}`}
                      style={{
                        left: text.x,
                        top: text.y,
                        width: text.width,
                        height: text.height,
                        transform: `rotate(${text.rotation}deg) scale(${text.scale})`,
                        transformOrigin: "center",
                        zIndex: text.zIndex,
                      }}
                    >
                      <button
                        type="button"
                        onPointerDown={(event) =>
                          beginInteraction(event, { type: "text", id: text.id }, "move", text.x, text.y, text.width, text.height, text.scale, text.rotation)
                        }
                        onDoubleClick={() => handleEditText(text)}
                        className={`flex h-full w-full cursor-grab items-center justify-center whitespace-pre text-center leading-[0.9] active:cursor-grabbing ${getFontClass(text.font)}`}
                        style={{ color: text.color, fontSize: text.fontSize / 4 }}
                      >
                        {text.text}
                      </button>
                      {isSelected ? (
                        <>
                          <button
                            type="button"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setTexts((items) => items.filter((item) => item.id !== text.id));
                              setSelectedTarget(null);
                            }}
                            className="absolute -right-3 -top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                            style={getHandleStyle(text.scale)}
                          >
                            <X size={14} />
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) =>
                              beginInteraction(
                                event,
                                { type: "text", id: text.id },
                                "rotate",
                                text.x,
                                text.y,
                                text.width,
                                text.height,
                                text.scale,
                                text.rotation,
                              )
                            }
                            className="absolute -left-3 -top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                            style={getHandleStyle(text.scale)}
                          >
                            <RotateCw size={13} />
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleEditText(text);
                            }}
                            className="absolute -bottom-3 -left-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                            style={getHandleStyle(text.scale)}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) =>
                              beginInteraction(
                                event,
                                { type: "text", id: text.id },
                                "resize",
                                text.x,
                                text.y,
                                text.width,
                                text.height,
                                text.scale,
                                text.rotation,
                              )
                            }
                            className="absolute -bottom-3 -right-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                            style={getHandleStyle(text.scale)}
                          >
                            <Maximize2 size={12} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  );
                })}

              {stickers
                .slice()
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((sticker) => {
                  const isSelected = !isCaptureMode && selectedTarget?.type === "sticker" && selectedTarget.id === sticker.id;

                  return (
                    <div
                      key={sticker.id}
                      className={`absolute ${isSelected ? "outline outline-2 outline-[#6ab5ff]" : ""}`}
                      style={{
                        left: sticker.x,
                        top: sticker.y,
                        width: sticker.width,
                        height: sticker.height,
                        transform: `rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
                        transformOrigin: "center",
                        zIndex: sticker.zIndex,
                      }}
                    >
                      <button
                        type="button"
                        onPointerDown={(event) =>
                          beginInteraction(
                            event,
                            { type: "sticker", id: sticker.id },
                            "move",
                            sticker.x,
                            sticker.y,
                            sticker.width,
                            sticker.height,
                            sticker.scale,
                            sticker.rotation,
                          )
                        }
                        className="relative h-full w-full cursor-grab active:cursor-grabbing"
                      >
                        <Image src={sticker.src} alt="sticker" fill sizes="150px" className="object-contain" unoptimized />
                      </button>

                      {isSelected ? (
                        <>
                          <button
                            type="button"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setStickers((items) => items.filter((item) => item.id !== sticker.id));
                              setSelectedTarget(null);
                            }}
                            className="absolute -right-3 -top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                            style={getHandleStyle(sticker.scale)}
                          >
                            <X size={14} />
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) =>
                              beginInteraction(
                                event,
                                { type: "sticker", id: sticker.id },
                                "rotate",
                                sticker.x,
                                sticker.y,
                                sticker.width,
                                sticker.height,
                                sticker.scale,
                                sticker.rotation,
                              )
                            }
                            className="absolute -left-3 -top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                            style={getHandleStyle(sticker.scale)}
                          >
                            <RotateCw size={13} />
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) =>
                              beginInteraction(
                                event,
                                { type: "sticker", id: sticker.id },
                                "resize",
                                sticker.x,
                                sticker.y,
                                sticker.width,
                                sticker.height,
                                sticker.scale,
                                sticker.rotation,
                              )
                            }
                            className="absolute -bottom-3 -right-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#6ab5ff] bg-white"
                            style={getHandleStyle(sticker.scale)}
                          >
                            <Maximize2 size={12} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  );
                })}

              <div className="pointer-events-none absolute z-[600] bottom-2 -left-1 h-[50px] w-[194px]">
                <Image src="/assets/misc/Card_Footer.png" alt="Card footer" fill sizes="194px" className="object-contain" unoptimized />
              </div>

            </div>
          </div>

          <div className="flex w-full justify-between gap-6">
            <button
              type="button"
              onClick={handleRestart}
              className="h-[50px] w-[130px] rounded-[12px] bg-[#f1f1f1] text-[33px] font-semibold shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
            >
              <span className="relative -top-1 text-[0.54em]">Restart</span>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="h-[50px] w-[130px] rounded-[12px] bg-[#ff661e] text-[33px] font-bold text-white shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
            >
              <span className="relative -top-1 text-[0.54em]">Submit</span>
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              className="h-[50px] w-[130px] rounded-[12px] bg-[#f1f1f1] text-[33px] font-semibold shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
            >
              <span className="relative -top-1 text-[0.54em]">Save</span>
            </button>
          </div>
        </section>

        <section className="h-[528px] w-full rounded-2xl border border-[#e9e9e9] bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.12)] lg:w-[480px]">
          <div className="flex h-[40px] gap-2">
            {TAB_LABELS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex h-full flex-1 items-center justify-center rounded-[10px] text-[15px] leading-none ${
                  activeTab === tab.key ? "bg-[#ffe27d]" : "bg-white"
                }`}
              >
                <span className={activeTab === tab.key ? "font-bold" : "font-semibold"}>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 h-[416px] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-4">
              {paletteItems.map((item) => {
                if (item.frame) {
                  return (
                    <button
                      key={item.src}
                      type="button"
                      onClick={() => setSelectedFrame(item.src)}
                      className={`relative h-[126px] w-[126px] overflow-hidden rounded-sm border ${
                        selectedFrame === item.src ? "border-[#ff661e]" : "border-transparent"
                      }`}
                    >
                      <Image src={item.src} alt="frame" fill sizes="126px" className="object-cover" unoptimized />
                    </button>
                  );
                }

                return (
                  <button
                    key={item.src}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        "application/card-sticker",
                        JSON.stringify({ src: item.src, width: item.width, height: item.height }),
                      );
                    }}
                    className={`relative rounded-md ${activeTab === "persons" ? "h-[130px]" : "h-[96px]"}`}
                  >
                    <Image src={item.src} alt="palette sticker" fill sizes="120px" className="object-contain" unoptimized />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {textModalOpen ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <p className="text-[18px] font-semibold text-[#1c1815]">Enter your thank you message:</p>
            <textarea
              value={textModalValue}
              onChange={(event) => setTextModalValue(event.target.value)}
              rows={4}
              maxLength={500}
              autoFocus
              className="mt-3 w-full resize-none rounded-xl border border-[#dbdbdb] px-3 py-2 text-[15px] outline-none focus:border-[#ff661e]"
              placeholder="Type your message"
            />
            <p className="mt-1 text-right text-xs text-[#8c8c8c]">{textModalValue.length}/500</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setTextModalOpen(false);
                  setTextModalValue("");
                  setEditingTextId(null);
                }}
                className="rounded-xl bg-[#f1f1f1] px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTextModalSubmit}
                className="rounded-xl bg-[#ff661e] px-4 py-2 text-sm font-bold text-white"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
