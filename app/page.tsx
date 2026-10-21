"use client";

import { toPng } from "html-to-image";
import { DragEvent, PointerEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActionButtons } from "@/components/card-maker/ActionButtons";
import { CardCanvas } from "@/components/card-maker/CardCanvas";
import { DesktopEditorPanel } from "@/components/card-maker/DesktopEditorPanel";
import { DesktopPalettePanel } from "@/components/card-maker/DesktopPalettePanel";
import { IntroContent } from "@/components/card-maker/IntroContent";
import { MobilePalettePanel } from "@/components/card-maker/MobilePalettePanel";
import { StatusNotice } from "@/components/card-maker/StatusNotice";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  CARD_ASPECT_RATIO,
  frameSources,
  messageSources,
  personSources,
  stickerSources,
  TAB_LABELS,
} from "@/lib/card-maker/constants";
import { renderCardImage, submitCardImage, uploadDownloadImage } from "@/lib/card-maker/submit";
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

export default function Home() {
  return <Suspense><CardMaker /></Suspense>;
}

function CardMaker() {
  const eventMode = useSearchParams().get("event") === "true";
  const [isExporting, setIsExporting] = useState(false);
  const exportingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<TabKey>("messages");
  const [selectedFrame, setSelectedFrame] = useState(frameSources[1]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget>(null);
  const [isCaptureMode, setIsCaptureMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counter, setCounter] = useState(1);
  const [cardScale, setCardScale] = useState(1);
  const [mobileTabMenuOpen, setMobileTabMenuOpen] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string; linkHref?: string; qrUrl?: string; confirmClear?: boolean; download?: boolean } | null>(null);

  const cardViewportRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const cardCaptureRef = useRef<HTMLDivElement | null>(null);
  const mobileTabMenuRef = useRef<HTMLDivElement | null>(null);
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
    return personSources.map((src) => ({ src, width: 90, height: 130, frame: false }));
  }, [activeTab]);

  const activeTabLabel = useMemo(() => TAB_LABELS.find((tab) => tab.key === activeTab)?.label ?? "", [activeTab]);

  useEffect(() => {
    if (!cardViewportRef.current) return;

    const element = cardViewportRef.current;
    const observer = new ResizeObserver(() => {
      const bounds = element.getBoundingClientRect();
      const ratio = bounds.width / BOARD_WIDTH;
      setCardScale(Math.min(ratio, 1));
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
    if (!cardCaptureRef.current || exportingRef.current || isSubmittingRef.current) return;
    exportingRef.current = true;
    setIsExporting(true);
    setNotice({
      title: eventMode ? "Preparing your QR code…" : "Thank you for participating,",
      message: eventMode ? "Please wait while we prepare your card." : "your download will start shortly.",
    });
    setIsCaptureMode(true);
    try {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
      if (eventMode) {
        const image = await renderCardImage(cardCaptureRef.current);
        const qrUrl = await uploadDownloadImage(image);
        setNotice({
          title: "Thank you for participating!",
          message: "Scan the QR code to open the image on your phone. Long press to save your card.",
          qrUrl,
        });
        return;
      }
      const dataUrl = await toPng(cardCaptureRef.current, { cacheBust: true, pixelRatio: 2 });
      const anchor = document.createElement("a");
      anchor.download = "community-care-card.png";
      anchor.href = dataUrl;
      anchor.click();
    } catch (error) {
      setNotice({
        title: "Download failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsCaptureMode(false);
      exportingRef.current = false;
      setIsExporting(false);
    }
  }

  async function handleShare() {
    if (typeof navigator.share !== "function") {
      setNotice({ title: "Sharing unavailable", message: "Your browser does not support native sharing. Download your card and share it from your photos." });
      return;
    }
    if (!cardCaptureRef.current || exportingRef.current || isSubmittingRef.current) return;
    exportingRef.current = true;
    setIsExporting(true);
    setIsCaptureMode(true);
    try {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
      const dataUrl = await toPng(cardCaptureRef.current, { cacheBust: true, pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "community-care-card.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My thank you card" });
      } else {
        const url = await uploadDownloadImage(blob);
        await navigator.share({ url, title: "My thank you card" });
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        setNotice({ title: "Sharing unavailable", message: "Please download your card and share it from your photos, or try sharing again." });
      }
    } finally {
      setIsCaptureMode(false);
      exportingRef.current = false;
      setIsExporting(false);
    }
  }

  function handleRestart() {
    setNotice({
      title: "This will clear your current card.",
      message: "Would you like to proceed?",
      confirmClear: true,
    });
  }

  function confirmRestart() {
    setStickers([]);
    setSelectedTarget(null);
    setNotice(null);
  }

  async function handleSubmit() {
    if (!cardCaptureRef.current || isSubmittingRef.current || exportingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    // Reused across retries of the same submission so the server stores one card.
    submissionKeyRef.current ??= crypto.randomUUID();
    setIsCaptureMode(true);
    try {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
      const image = await renderCardImage(cardCaptureRef.current);
      await submitCardImage(image, submissionKeyRef.current);
      submissionKeyRef.current = null;
      setNotice({
        title: "Thank You!",
        message: "Your card has been submitted.",
        download: true,
      });
    } catch (error) {
      setNotice({
        title: "Submission failed",
        message: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsCaptureMode(false);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
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

        <DesktopEditorPanel />

        <section className="flex w-full flex-col items-center gap-4 lg:w-[443px] lg:gap-6">
          <CardCanvas
            cardScale={cardScale}
            selectedFrame={selectedFrame}
            stickers={stickers}
            selectedTarget={selectedTarget}
            isCaptureMode={isCaptureMode}
            cardViewportRef={cardViewportRef}
            cardCaptureRef={cardCaptureRef}
            cardRef={cardRef}
            onDrop={handleDrop}
            onDeselect={() => setSelectedTarget(null)}
            onBeginInteraction={beginInteraction}
            onDeleteSticker={handleDeleteSticker}
          />

          <ActionButtons
            isExporting={isExporting}
            onShare={!eventMode ? () => void handleShare() : undefined}
            isSubmitting={isSubmitting}
            onRestart={handleRestart}
            onSubmit={() => void handleSubmit()}
            onSave={() => void handleSave()}
          />

          <MobilePalettePanel
            isExporting={isExporting}
            onShare={!eventMode ? () => void handleShare() : undefined}
            activeTab={activeTab}
            activeTabLabel={activeTabLabel}
            mobileTabMenuOpen={mobileTabMenuOpen}
            mobileTabMenuRef={mobileTabMenuRef}
            paletteItems={paletteItems}
            selectedFrame={selectedFrame}
            onToggleMenu={() => setMobileTabMenuOpen((open) => !open)}
            onSelectTab={handleSelectMobileTab}
            onSelectFrame={setSelectedFrame}
            onAddSticker={(payload) => addSticker(payload, BOARD_WIDTH / 2, BOARD_HEIGHT / 2)}
            onDragStartItem={handlePaletteDragStart}
            isSubmitting={isSubmitting}
            onRestart={handleRestart}
            onSubmit={() => void handleSubmit()}
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

      <StatusNotice
        open={notice !== null}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        linkHref={notice?.linkHref}
        qrUrl={notice?.qrUrl}
        onDownload={notice?.download ? () => void handleSave() : undefined}
        onConfirm={notice?.confirmClear ? confirmRestart : undefined}
        onClose={() => setNotice(null)}
      />

    </main>
  );
}
