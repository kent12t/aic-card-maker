"use client";

import { DragEvent, PointerEvent, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActionButtons } from "@/components/card-maker/ActionButtons";
import { CardCanvas } from "@/components/card-maker/CardCanvas";
import { PalettePanel } from "@/components/card-maker/PalettePanel";
import { EditorInstructions } from "@/components/card-maker/EditorInstructions";
import { HowItWorks } from "@/components/card-maker/HowItWorks";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { PageTransitionReady } from "@/components/navigation/PageTransition";
import { StatusNotice, type CardNotice } from "@/components/card-maker/StatusNotice";
import { circular, caslon } from "@/lib/fonts";
import styles from "./page.module.css";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  WALL_CARD_HEIGHT,
  WALL_CARD_WIDTH,
  CARD_ASPECT_RATIO,
  frameSources,
  messageSources,
  personSources,
  stickerSources,
} from "@/lib/card-maker/constants";
import { renderCardImage } from "@/lib/card-maker/render";
import { submitCardImage, uploadDownloadImage } from "@/lib/card-maker/submit";
import {
  clamp,
  clampPositionForScale,
} from "@/lib/card-maker/utils";
import type {
  DragPayload,
  InteractionMode,
  InteractionState,
  PaletteItem,
  SelectedTarget,
  StickerItem,
  TabKey,
} from "@/lib/card-maker/types";

export default function DesignPage() {
  return <Suspense><CardMaker /></Suspense>;
}

function CardMaker() {
  const eventMode = useSearchParams().get("event") === "true";
  const [isExporting, setIsExporting] = useState(false);
  const exportingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<TabKey>("frames");
  const [selectedFrame, setSelectedFrame] = useState(frameSources[5]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counter, setCounter] = useState(1);
  const [cardScale, setCardScale] = useState(1);
  const [notice, setNotice] = useState<CardNotice | null>(null);
  const noticeRequestRef = useRef(0);

  useEffect(() => {
    if (notice?.kind !== "submitted") return;
    return () => URL.revokeObjectURL(notice.imageUrl);
  }, [notice]);

  function closeNotice() {
    noticeRequestRef.current += 1;
    setNotice(null);
  }

  const cardViewportRef = useRef<HTMLDivElement | null>(null);
  const libraryRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<InteractionState | null>(null);
  const isSubmittingRef = useRef(false);
  const submissionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!eventMode) return;
    let deadline = Date.now() + 60_000;
    const resetDeadline = () => { deadline = Date.now() + 60_000; };
    const checkDeadline = () => {
      if (Date.now() >= deadline) window.location.reload();
    };
    const events = ["pointerdown", "pointermove", "keydown", "input", "wheel", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, resetDeadline, { passive: true }));
    const interval = window.setInterval(checkDeadline, 1000);
    document.addEventListener("visibilitychange", checkDeadline);
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetDeadline));
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkDeadline);
    };
  }, [eventMode]);

  const paletteItems = useMemo<PaletteItem[]>(() => {
    if (activeTab === "frames") {
      return frameSources.map((src) => ({ src, width: 126, height: 126 / CARD_ASPECT_RATIO, frame: true }));
    }
    if (activeTab === "messages") {
      return messageSources.map((src) => ({ src, width: 110, height: 110, frame: false }));
    }
    if (activeTab === "stickers") {
      return stickerSources.map((src) => ({ src, width: 100, height: 100, frame: false }));
    }
    return personSources.map((src) => ({ src, width: 90, height: 90, frame: false }));
  }, [activeTab]);

  useLayoutEffect(() => {
    if (!cardViewportRef.current) return;

    const element = cardViewportRef.current;
    const library = libraryRef.current;
    const tabs = library?.querySelector('[role="tablist"]');
    const measure = () => {
      const bounds = element.getBoundingClientRect();
      const ratio = bounds.width / BOARD_WIDTH;
      setCardScale(ratio);
      if (library && tabs) {
        const height = bounds.bottom - tabs.getBoundingClientRect().bottom;
        library.style.setProperty("--desktop-palette-height", `${Math.max(0, height)}px`);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);

    observer.observe(element);
    if (tabs) observer.observe(tabs);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent) {
      const interaction = interactionRef.current;
      if (!interaction || !cardRef.current) return;

      const boardRect = cardRef.current.getBoundingClientRect();
      const scaleX = BOARD_WIDTH / Math.max(1, boardRect.width);
      const scaleY = BOARD_HEIGHT / Math.max(1, boardRect.height);
      const pointerX = (event.clientX - boardRect.left) * scaleX;
      const pointerY = (event.clientY - boardRect.top) * scaleY;

      if (!interaction.target) return;
      const { target } = interaction;

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
    const scaleX = BOARD_WIDTH / Math.max(1, boardRect?.width ?? BOARD_WIDTH);
    const scaleY = BOARD_HEIGHT / Math.max(1, boardRect?.height ?? BOARD_HEIGHT);
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

  function addSticker(payload: DragPayload, dropX: number, dropY: number) {
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
        zIndex: counter + 20,
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
    const scaleX = BOARD_WIDTH / Math.max(1, rect.width);
    const scaleY = BOARD_HEIGHT / Math.max(1, rect.height);
    addSticker(payload, (event.clientX - rect.left) * scaleX, (event.clientY - rect.top) * scaleY);
  }

  async function handleSave() {
    if (exportingRef.current || isSubmittingRef.current) return;
    exportingRef.current = true;
    setIsExporting(true);
    const request = ++noticeRequestRef.current;
    setNotice({
      kind: "loading",
      title: eventMode ? "Preparing your QR code…" : "Preparing your download…",
      message: "Please wait while we prepare your card.",
    });
    try {
      if (eventMode) {
        const image = await renderCardImage({ frame: selectedFrame, stickers });
        const qrUrl = await uploadDownloadImage(image);
        if (request === noticeRequestRef.current) setNotice({ kind: "eventDownload", qrUrl });
        return;
      }
      const image = await renderCardImage({ frame: selectedFrame, stickers }, {
        width: BOARD_WIDTH * 2,
        height: Math.round(BOARD_HEIGHT * 2),
        mimeType: "image/png",
      });
      const imageUrl = URL.createObjectURL(image);
      const anchor = document.createElement("a");
      anchor.download = "community-care-card.png";
      anchor.href = imageUrl;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(imageUrl), 60_000);
      if (request === noticeRequestRef.current) {
        setNotice({ kind: "download", file: new File([image], "community-care-card.png", { type: "image/png" }) });
      }
    } catch (error) {
      if (request === noticeRequestRef.current) setNotice({
        kind: "error",
        title: "Download failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      exportingRef.current = false;
      setIsExporting(false);
    }
  }

  function handleRestart() {
    setNotice({ kind: "clear" });
  }

  function confirmRestart() {
    setStickers([]);
    setSelectedFrame(frameSources[5]);
    setActiveTab("messages");
    setCounter(1);
    setSelectedTarget(null);
    submissionKeyRef.current = null;
    closeNotice();
  }

  async function handleSubmit() {
    if (isSubmittingRef.current || exportingRef.current) return;
    // A frame alone is not a personalised card, even if it was changed.
    if (stickers.length === 0) {
      setNotice({
        kind: "error",
        title: "Your card is still blank",
        message: "Please add a message, sticker, or CCP before submitting your card.",
      });
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    // Reused across retries of the same submission so the server stores one card.
    submissionKeyRef.current ??= crypto.randomUUID();
    try {
      const image = await renderCardImage({ frame: selectedFrame, stickers });
      const wallImage = await renderCardImage(
        { frame: selectedFrame, stickers },
        { width: WALL_CARD_WIDTH, height: WALL_CARD_HEIGHT },
      );
      const { cardId } = await submitCardImage(wallImage, submissionKeyRef.current);
      submissionKeyRef.current = null;
      setNotice({
        kind: "submitted",
        imageUrl: URL.createObjectURL(image),
        cardId,
        file: new File([image], `community-care-card.${image.type === "image/png" ? "png" : "webp"}`, { type: image.type }),
      });
    } catch (error) {
      setNotice({
        kind: "error",
        title: "Submission failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleDeleteSticker(id: string) {
    setStickers((items) => items.filter((item) => item.id !== id));
    setSelectedTarget(null);
  }

  return (
    <div className={`${styles.designer} ${circular.variable} ${caslon.variable}`}>
      <PageTransitionReady imageSrc={selectedFrame} />
      <SiteHeader compact />
      <main className={styles.editor}>
        <section ref={libraryRef} className={styles.library} aria-label="Card design elements">
          <PalettePanel
            activeTab={activeTab}
            paletteItems={paletteItems}
            selectedFrame={selectedFrame}
            onSelectTab={setActiveTab}
            onSelectFrame={setSelectedFrame}
            onAddSticker={(payload) => addSticker(payload, BOARD_WIDTH / 2, BOARD_HEIGHT / 2)}
            onDragStartItem={handlePaletteDragStart}
          />
        </section>

        <section className={styles.workspace} aria-label="Your thank you card">
          <HowItWorks />
          <CardCanvas
            cardScale={cardScale}
            selectedFrame={selectedFrame}
            stickers={stickers}
            selectedTarget={selectedTarget}
            cardViewportRef={cardViewportRef}
            cardRef={cardRef}
            onDrop={handleDrop}
            onDeselect={() => setSelectedTarget(null)}
            onBeginInteraction={beginInteraction}
            onDeleteSticker={handleDeleteSticker}
          />
          <EditorInstructions />
          <ActionButtons
            isExporting={isExporting}
            isSubmitting={isSubmitting}
            onRestart={handleRestart}
            onSubmit={() => void handleSubmit()}
            onSave={() => void handleSave()}
          />

        </section>
      </main>

      <StatusNotice
        notice={notice}
        eventMode={eventMode}
        onRestart={confirmRestart}
        onNewCard={confirmRestart}
        onClose={closeNotice}
      />

    </div>
  );
}
