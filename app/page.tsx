"use client";

import { toPng } from "html-to-image";
import Image from "next/image";
import { ChangeEvent, DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type TabKey = "frames" | "messages" | "stickers" | "persons";

type StickerItem = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

type TextItem = {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  font: "open" | "circular" | "caveat" | "kalam";
  size: number;
  zIndex: number;
};

type DragPayload = {
  src: string;
  width: number;
  height: number;
};

const TAB_LABELS: { key: TabKey; label: string }[] = [
  { key: "frames", label: "Frames" },
  { key: "messages", label: "Messages" },
  { key: "stickers", label: "Stickers" },
  { key: "persons", label: "CCP Stickers" },
];

const FONT_BUTTONS: { key: TextItem["font"]; label: string; className: string }[] = [
  { key: "open", label: "Font 1", className: "font-open-sans font-bold" },
  { key: "circular", label: "Font 2", className: "font-circular" },
  { key: "caveat", label: "Font 3", className: "font-caveat text-[40px]" },
  { key: "kalam", label: "Font 4", className: "font-kalam italic text-[31px]" },
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

const initialText: TextItem = {
  id: "t1",
  text: "Thank you\nfor your\ndedication!",
  x: 198,
  y: 90,
  color: "#6b3b9c",
  font: "open",
  size: 66,
  zIndex: 10,
};

const initialSticker: StickerItem = {
  id: "s1",
  src: "/assets/messages/msg_5.png",
  x: 76,
  y: 255,
  width: 115,
  height: 115,
  zIndex: 12,
};

function getFontClass(font: TextItem["font"]) {
  if (font === "circular") return "font-circular";
  if (font === "caveat") return "font-caveat";
  if (font === "kalam") return "font-kalam";
  return "font-glass";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("messages");
  const [selectedFrame, setSelectedFrame] = useState(frameSources[1]);
  const [stickers, setStickers] = useState<StickerItem[]>([initialSticker]);
  const [texts, setTexts] = useState<TextItem[]>([initialText]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(initialSticker.id);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(initialText.id);
  const [counter, setCounter] = useState(2);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardCaptureRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragState = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const selectedText = useMemo(
    () => texts.find((item) => item.id === selectedTextId) ?? null,
    [texts, selectedTextId],
  );

  useEffect(() => {
    function onPointerMove(event: globalThis.PointerEvent) {
      if (!dragState.current || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const { id, dx, dy } = dragState.current;

      setStickers((items) =>
        items.map((item) => {
          if (item.id !== id) return item;
          const maxX = 397 - item.width;
          const maxY = 397 - item.height;
          const x = Math.max(0, Math.min(maxX, event.clientX - rect.left - dx));
          const y = Math.max(0, Math.min(maxY, event.clientY - rect.top - dy));
          return { ...item, x, y };
        }),
      );
    }

    function onPointerUp() {
      dragState.current = null;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

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

  function addSticker(payload: DragPayload, dropX: number, dropY: number) {
    const x = Math.max(0, Math.min(397 - payload.width, dropX - payload.width / 2));
    const y = Math.max(0, Math.min(397 - payload.height, dropY - payload.height / 2));
    const id = `s${counter}`;
    setCounter((value) => value + 1);

    setStickers((items) => [...items, { id, src: payload.src, x, y, width: payload.width, height: payload.height, zIndex: counter + 20 }]);
    setSelectedStickerId(id);
    setSelectedTextId(null);
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

  function handleStickerPointerDown(event: PointerEvent<HTMLDivElement>, sticker: StickerItem) {
    event.preventDefault();
    event.stopPropagation();
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const dx = event.clientX - rect.left - sticker.x;
    const dy = event.clientY - rect.top - sticker.y;
    dragState.current = { id: sticker.id, dx, dy };
    setSelectedStickerId(sticker.id);
    setSelectedTextId(null);
  }

  function updateSelectedText(partial: Partial<TextItem>) {
    if (!selectedTextId) return;
    setTexts((items) => items.map((item) => (item.id === selectedTextId ? { ...item, ...partial } : item)));
  }

  function handleAddText() {
    const id = `t${counter}`;
    setCounter((value) => value + 1);
    setTexts((items) => [
      ...items,
      {
        id,
        text: "Type here",
        x: 120,
        y: 170,
        color: "#1c1815",
        font: "open",
        size: 38,
        zIndex: counter + 30,
      },
    ]);
    setSelectedTextId(id);
    setSelectedStickerId(null);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const src = URL.createObjectURL(file);
    addSticker({ src, width: 120, height: 120 }, 200, 230);
  }

  function onDropUpload(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const src = URL.createObjectURL(file);
    addSticker({ src, width: 120, height: 120 }, 200, 230);
  }

  async function handleSave() {
    if (!cardCaptureRef.current) return;
    const dataUrl = await toPng(cardCaptureRef.current, { cacheBust: true, pixelRatio: 2 });
    const anchor = document.createElement("a");
    anchor.download = "community-care-card.png";
    anchor.href = dataUrl;
    anchor.click();
  }

  function handleRestart() {
    setStickers([]);
    setTexts([initialText]);
    setSelectedStickerId(null);
    setSelectedTextId(initialText.id);
  }

  function handleSubmit() {
    const payload = {
      frame: selectedFrame,
      stickers: stickers.map(({ id, src, x, y, width, height }) => ({ id, src, x, y, width, height })),
      texts,
      createdAt: new Date().toISOString(),
    };

    // Placeholder submission action for integration.
    console.info("Card submission payload", payload);
    alert("Card submitted. Hook this payload to your form endpoint.");
  }

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-[1595px] flex-col gap-6 lg:flex-row lg:items-start">
        <section className="w-full rounded-2xl bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.12)] lg:w-[480px] lg:h-[528px]">
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
            <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#84898f] text-white">T</span>
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
                  className={`h-[42px] w-[100px] rounded-[10px] text-[33px] leading-none ${font.className} ${
                    selected ? "bg-[#ffe27d]" : "bg-white"
                  }`}
                >
                  <span className="relative -top-1 text-[0.55em]">{font.label}</span>
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
              <span className="text-4xl text-[#8c8c8c]">&#8679;</span>
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
              onPointerDown={() => {
                setSelectedStickerId(null);
                setSelectedTextId(null);
              }}
              className="absolute left-[23px] top-[23px] h-[397px] w-[397px] rounded-[16px] bg-[#fbf7ef]"
            >
              {texts
                .slice()
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((text) => (
                  <button
                    key={text.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedTextId(text.id);
                      setSelectedStickerId(null);
                    }}
                    className={`absolute whitespace-pre text-center leading-[0.9] ${getFontClass(text.font)} ${
                      selectedTextId === text.id ? "outline outline-1 outline-[#6ab5ff]" : ""
                    }`}
                    style={{ left: text.x, top: text.y, color: text.color, fontSize: text.size / 4 }}
                  >
                    {text.text}
                  </button>
                ))}

              {stickers
                .slice()
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((sticker) => {
                  const selected = selectedStickerId === sticker.id;
                  return (
                    <div
                      key={sticker.id}
                      onPointerDown={(event) => handleStickerPointerDown(event, sticker)}
                      className={`absolute cursor-grab active:cursor-grabbing ${selected ? "outline outline-2 outline-[#6ab5ff]" : ""}`}
                      style={{ left: sticker.x, top: sticker.y, width: sticker.width, height: sticker.height, zIndex: sticker.zIndex }}
                    >
                      <Image src={sticker.src} alt="sticker" fill sizes="150px" className="object-contain" unoptimized />
                      {selected ? (
                        <button
                          type="button"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setStickers((items) => items.filter((item) => item.id !== sticker.id));
                            setSelectedStickerId(null);
                          }}
                          className="absolute -right-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#6ab5ff] bg-white text-xs"
                        >
                          X
                        </button>
                      ) : null}
                    </div>
                  );
                })}

              <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded-full bg-white px-2 py-1 text-[9px] font-semibold text-[#ff661e]">
                <span>iCiY</span>
                <span>Community Care Day</span>
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
                className={`h-full flex-1 rounded-[10px] text-[31px] font-bold leading-none ${
                  activeTab === tab.key ? "bg-[#ffe27d]" : "bg-white"
                }`}
              >
                <span className="relative top-[2px] text-[0.5em]">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 h-[416px] overflow-y-auto pr-1">
            <div className={`grid gap-4 ${activeTab === "persons" ? "grid-cols-3" : "grid-cols-3"}`}>
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
                      event.dataTransfer.setData("application/card-sticker", JSON.stringify(item));
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
    </main>
  );
}
