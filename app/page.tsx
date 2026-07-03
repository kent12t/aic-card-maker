"use client";

import { toPng } from "html-to-image";
import { ChangeEvent, DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { ActionButtons } from "@/components/card-maker/ActionButtons";
import { CardCanvas } from "@/components/card-maker/CardCanvas";
import { DesktopEditorPanel } from "@/components/card-maker/DesktopEditorPanel";
import { DesktopPalettePanel } from "@/components/card-maker/DesktopPalettePanel";
import { IntroContent } from "@/components/card-maker/IntroContent";
import { MobilePalettePanel } from "@/components/card-maker/MobilePalettePanel";
import { TextModal } from "@/components/card-maker/TextModal";
import {
  BOARD_SIZE,
  frameSources,
  messageSources,
  personSources,
  stickerSources,
  TAB_LABELS,
} from "@/lib/card-maker/constants";
import {
  clamp,
  clampPositionForScale,
  getTextMaxScale,
  measureTextBox,
  normalizeTextInput,
} from "@/lib/card-maker/utils";
import type {
  DragPayload,
  FontKey,
  InteractionMode,
  InteractionState,
  PaletteItem,
  SelectedTarget,
  StickerItem,
  TabKey,
  TextItem,
} from "@/lib/card-maker/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("messages");
  const [selectedFrame, setSelectedFrame] = useState(frameSources[1]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget>(null);
  const [isCaptureMode, setIsCaptureMode] = useState(false);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [textModalValue, setTextModalValue] = useState("");
  const [textModalFont, setTextModalFont] = useState<FontKey>("open");
  const [textModalColor, setTextModalColor] = useState("#6b3b9c");
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [counter, setCounter] = useState(1);
  const [cardScale, setCardScale] = useState(1);
  const [mobileTabMenuOpen, setMobileTabMenuOpen] = useState(false);

  const cardViewportRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardCaptureRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileTabMenuRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<InteractionState | null>(null);

  const selectedText = useMemo(() => {
    if (!selectedTarget || selectedTarget.type !== "text") return null;
    return texts.find((item) => item.id === selectedTarget.id) ?? null;
  }, [texts, selectedTarget]);

  const paletteItems = useMemo<PaletteItem[]>(() => {
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

  const activeTabLabel = useMemo(() => TAB_LABELS.find((tab) => tab.key === activeTab)?.label ?? "", [activeTab]);

  useEffect(() => {
    if (!cardViewportRef.current) return;

    const element = cardViewportRef.current;
    const observer = new ResizeObserver(() => {
      const bounds = element.getBoundingClientRect();
      const ratio = bounds.width / BOARD_SIZE;
      setCardScale(clamp(ratio, 0.66, 1));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mobileTabMenuOpen) return;

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!mobileTabMenuRef.current?.contains(event.target as Node)) {
        setMobileTabMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [mobileTabMenuOpen]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (textModalOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [textModalOpen]);

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent) {
      const interaction = interactionRef.current;
      if (!interaction || !cardRef.current) return;

      const boardRect = cardRef.current.getBoundingClientRect();
      const scaleX = BOARD_SIZE / Math.max(1, boardRect.width);
      const scaleY = BOARD_SIZE / Math.max(1, boardRect.height);
      const pointerX = (event.clientX - boardRect.left) * scaleX;
      const pointerY = (event.clientY - boardRect.top) * scaleY;

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
    const scaleX = BOARD_SIZE / Math.max(1, boardRect?.width ?? BOARD_SIZE);
    const scaleY = BOARD_SIZE / Math.max(1, boardRect?.height ?? BOARD_SIZE);
    const pointerX = (event.clientX - (boardRect?.left ?? 0)) * scaleX;
    const pointerY = (event.clientY - (boardRect?.top ?? 0)) * scaleY;
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
    const clampedPosition = clampPositionForScale(initialX, initialY, payload.width, payload.height, 1, 0.2);

    setStickers((items) => [
      ...items,
      {
        id,
        src: payload.src,
        x: clampedPosition.x,
        y: clampedPosition.y,
        width: payload.width,
        height: payload.height,
        rotation: 0,
        scale: 1,
        zIndex: source === "upload" ? counter + 5 : counter + 20,
      },
    ]);

    setSelectedTarget({ type: "sticker", id });
  }

  function handlePaletteDragStart(event: DragEvent<HTMLButtonElement>, payload: DragPayload) {
    event.dataTransfer.setData("application/card-sticker", JSON.stringify(payload));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!cardRef.current) return;

    const raw = event.dataTransfer.getData("application/card-sticker");
    if (!raw) return;

    const payload = JSON.parse(raw) as DragPayload;
    const rect = cardRef.current.getBoundingClientRect();
    const scaleX = BOARD_SIZE / Math.max(1, rect.width);
    const scaleY = BOARD_SIZE / Math.max(1, rect.height);
    addSticker(payload, (event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY);
  }

  function updateSelectedText(partial: Partial<TextItem>) {
    if (!selectedTarget || selectedTarget.type !== "text") return;
    setTexts((items) => items.map((item) => (item.id === selectedTarget.id ? { ...item, ...partial } : item)));
  }

  function handleAddText() {
    setEditingTextId(null);
    setTextModalValue("");
    setTextModalFont("open");
    setTextModalColor("#6b3b9c");
    setTextModalOpen(true);
  }

  function handleEditText(target: TextItem) {
    setEditingTextId(target.id);
    setTextModalValue(target.text);
    setTextModalFont(target.font);
    setTextModalColor(target.color);
    setTextModalOpen(true);
  }

  function closeTextModal() {
    setTextModalOpen(false);
    setTextModalValue("");
    setTextModalFont("open");
    setTextModalColor("#6b3b9c");
    setEditingTextId(null);
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
          color: textModalColor,
          font: textModalFont,
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
            color: textModalColor,
            font: textModalFont,
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

  function handleDeleteText(id: string) {
    setTexts((items) => items.filter((item) => item.id !== id));
    setSelectedTarget(null);
  }

  function handleDeleteSticker(id: string) {
    setStickers((items) => items.filter((item) => item.id !== id));
    setSelectedTarget(null);
  }

  function handleSelectMobileTab(tab: TabKey) {
    setActiveTab(tab);
    setMobileTabMenuOpen(false);
  }

  return (
    <main className="overflow-x-hidden px-4 py-4 lg:px-8 lg:py-8">
      <div className="mx-auto flex w-full max-w-[1595px] flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <section className="lg:hidden">
          <IntroContent titleClassName="font-open-sans text-[22px] font-bold leading-none text-[#ff661e]" textClassName="text-[12px] font-semibold leading-[1.28] text-black" />
        </section>

        <DesktopEditorPanel
          selectedText={selectedText}
          fileInputRef={fileInputRef}
          onAddText={handleAddText}
          onUpdateSelectedText={updateSelectedText}
          onDropUpload={onDropUpload}
          onUpload={handleUpload}
        />

        <section className="flex w-full flex-col items-center gap-4 lg:w-[443px] lg:gap-6">
          <CardCanvas
            cardScale={cardScale}
            selectedFrame={selectedFrame}
            texts={texts}
            stickers={stickers}
            selectedTarget={selectedTarget}
            isCaptureMode={isCaptureMode}
            cardViewportRef={cardViewportRef}
            cardCaptureRef={cardCaptureRef}
            cardRef={cardRef}
            onDrop={handleDrop}
            onDeselect={() => setSelectedTarget(null)}
            onBeginInteraction={beginInteraction}
            onDeleteText={handleDeleteText}
            onEditText={handleEditText}
            onDeleteSticker={handleDeleteSticker}
          />

          <ActionButtons onRestart={handleRestart} onSubmit={handleSubmit} onSave={() => void handleSave()} />

          <MobilePalettePanel
            activeTab={activeTab}
            activeTabLabel={activeTabLabel}
            mobileTabMenuOpen={mobileTabMenuOpen}
            mobileTabMenuRef={mobileTabMenuRef}
            paletteItems={paletteItems}
            selectedFrame={selectedFrame}
            fileInputRef={fileInputRef}
            onToggleMenu={() => setMobileTabMenuOpen((open) => !open)}
            onSelectTab={handleSelectMobileTab}
            onSelectFrame={setSelectedFrame}
            onAddText={handleAddText}
            onAddSticker={(payload) => addSticker(payload, BOARD_SIZE / 2, BOARD_SIZE / 2)}
            onDragStartItem={handlePaletteDragStart}
            onDropUpload={onDropUpload}
            onUpload={handleUpload}
            onRestart={handleRestart}
            onSubmit={handleSubmit}
            onSave={() => void handleSave()}
          />
        </section>

        <DesktopPalettePanel
          activeTab={activeTab}
          paletteItems={paletteItems}
          selectedFrame={selectedFrame}
          onSelectTab={setActiveTab}
          onSelectFrame={setSelectedFrame}
          onDragStartItem={handlePaletteDragStart}
        />
      </div>

      <TextModal
        open={textModalOpen}
        value={textModalValue}
        font={textModalFont}
        color={textModalColor}
        onValueChange={setTextModalValue}
        onFontChange={setTextModalFont}
        onColorChange={setTextModalColor}
        onCancel={closeTextModal}
        onSubmit={handleTextModalSubmit}
      />
    </main>
  );
}
