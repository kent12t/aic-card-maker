import { Maximize2, RotateCw, X } from "lucide-react";
import styles from "@/app/design/page.module.css";

export function EditorInstructions() {
  return (
    <aside className={styles.instructions} aria-label="Sticker editing instructions">
      <p>Tap to edit the stickers on your card:</p>
      <ul>
        <li><span><RotateCw aria-hidden="true" /></span>Hold and drag to rotate</li>
        <li><span><Maximize2 aria-hidden="true" /></span>Hold and drag to resize</li>
        <li><span><X aria-hidden="true" /></span>Tap to delete sticker</li>
      </ul>
    </aside>
  );
}
