"use client";

import { QRCodeSVG } from "qrcode.react";
import { X } from "lucide-react";
import Image from "next/image";
import { EventLink as Link } from "@/components/navigation/EventLink";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import styles from "@/app/design/page.module.css";

export type CardNotice =
  | { kind: "clear" }
  | { kind: "loading"; title: string; message: string }
  | { kind: "error"; title: string; message: string }
  | { kind: "download"; file: File }
  | { kind: "eventDownload"; qrUrl: string }
  | { kind: "submitted"; imageUrl: string; cardId: string; file: File };

type StatusNoticeProps = {
  notice: CardNotice | null;
  eventMode: boolean;
  onRestart: () => void;
  onNewCard: () => void;
  onClose: () => void;
};

export function StatusNotice({ notice, eventMode, onRestart, onNewCard, onClose }: StatusNoticeProps) {
  const [shareFeedback, setShareFeedback] = useState<{ file: File; message: string } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const shareFile = notice?.kind === "download" || (notice?.kind === "submitted" && !eventMode)
    ? notice.file : null;

  async function shareCard() {
    if (!shareFile || isSharing) return;
    setShareFeedback(null);
    setIsSharing(true);
    try {
      const url = new URL("/", window.location.origin).href;
      if (navigator.share) {
        const files = [shareFile];
        await navigator.share(navigator.canShare?.({ files })
          ? { title: "My Community Care thank you card", files }
          : { title: "Create a Community Care thank you card", url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareFeedback({ file: shareFile, message: "Link copied! Share it with a friend." });
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        setShareFeedback({ file: shareFile, message: "Unable to share right now. Please try again." });
      }
    } finally {
      setIsSharing(false);
    }
  }

  const title = notice?.kind === "clear" ? "Clear your card?"
    : notice?.kind === "submitted" ? "Card submitted!"
    : notice?.kind === "download" ? "for participating!"
    : notice?.kind === "eventDownload" ? "Scan the QR code to download the image into your mobile."
    : notice?.title ?? "";

  return (
    <Modal open={notice !== null} onClose={onClose} labelledBy="status-notice-title" className={`${styles.helpDialog} ${styles.noticeDialog}`}>
      <div className={`${styles.noticeContent} ${notice?.kind === "submitted" ? styles.submittedNotice : ""}`} aria-busy={notice?.kind === "loading"}>
        <button type="button" className={styles.closeHelp} aria-label="Close dialog" onClick={onClose}><X aria-hidden="true" /></button>
        {notice?.kind === "download" && <Image src="/assets/messages/msg_9.webp" alt="Thank you" width={420} height={420} className={styles.thankYouImage} />}
        <h2 id="status-notice-title" className={styles.noticeTitle}>{title}</h2>

        {notice?.kind === "clear" && <p className={styles.noticeCopy}>All unsaved progress will be lost.<br />Would you like to proceed?</p>}
        {notice?.kind === "download" && <p className={styles.noticeCopy}>Your download will start shortly.</p>}
        {notice?.kind === "eventDownload" && <>
          <a href={notice.qrUrl} target="_blank" rel="noopener noreferrer" aria-label="Open your card image" className={styles.noticeQr}>
            <QRCodeSVG value={notice.qrUrl} size={280} level="M" marginSize={2} />
          </a>
          <p className={styles.noticeCopy}>Tap and hold on the image<br />to save it in your phone.<br />Thank you for participating!</p>
        </>}
        {notice?.kind === "submitted" && <>
          <div className={styles.submittedPreview}>
            <Image unoptimized src={notice.imageUrl} alt="Your submitted thank you card" width={640} height={530} className={styles.submittedImage} />
            <Image src="/assets/stickers/sticker_6.webp" alt="" width={120} height={120} className={styles.previewStickerTop} />
            <Image src="/assets/stickers/sticker_1.webp" alt="" width={120} height={120} className={styles.previewStickerBottom} />
          </div>
          <p className={styles.noticeCopy}>Thank you for letting our Community Care Professionals know that their work is seen and valued.{eventMode && <><br />Now look out for it on our Thank You Wall.</>}</p>
        </>}
        {(notice?.kind === "loading" || notice?.kind === "error") && <p className={styles.noticeCopy} role="status">{notice.message}</p>}

        <div className={styles.noticeActions}>
          {notice?.kind === "clear" ? <>
            <button type="button" className={styles.noticeButton} onClick={onClose}>Cancel</button>
            <button type="button" className={`${styles.noticeButton} ${styles.clearButton}`} onClick={onRestart}>Clear</button>
          </> : notice?.kind === "download" ? <>
            <button type="button" className={styles.noticeButton} onClick={onClose}>Back to my card</button>
            <button type="button" className={styles.noticeButton} onClick={onNewCard}>Create a new card</button>
            <button type="button" className={styles.noticeButton} disabled={isSharing} onClick={() => void shareCard()}>{isSharing ? "Sharing…" : "Share with a friend"}</button>
          </> : <>
            {notice?.kind === "eventDownload" && <button type="button" className={styles.noticeButton} onClick={onClose}>Back to my card</button>}
            {notice?.kind === "submitted" && !eventMode && <>
              <Link href={`/display?card=${encodeURIComponent(notice.cardId)}`} className={styles.noticeButton}>View the &apos;Thank You&apos; wall</Link>
              <button type="button" className={styles.noticeButton} disabled={isSharing} onClick={() => void shareCard()}>{isSharing ? "Sharing…" : "Share with a friend"}</button>
            </>}
            <button type="button" className={styles.noticeButton} onClick={onClose}>Close</button>
          </>}
        </div>
        {shareFile && shareFeedback?.file === shareFile && <p className={styles.shareFeedback} role="status">{shareFeedback.message}</p>}
      </div>
    </Modal>
  );
}
