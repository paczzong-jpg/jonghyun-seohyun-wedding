import type { ReactNode } from "react";
import styles from "./ArcadeScreen.module.css";

interface Props {
  children: ReactNode;
  title?: string;
  accent?: "cyan" | "green";
}

const ACCENT_CLASS: Record<NonNullable<Props["accent"]>, string> = {
  cyan: styles.accentCyan,
  green: styles.accentGreen,
};

/**
 * CRT-style bezel wrapper used as a frame around game canvases / content.
 */
export default function ArcadeScreen({
  children,
  title,
  accent = "cyan",
}: Props) {
  return (
    <div className={`${styles.bezel} ${ACCENT_CLASS[accent]}`}>
      {/* Top bar */}
      {title && (
        <div className={styles.topBar}>
          <span className={styles.screenTitle}>{title}</span>
          <span className={styles.led} />
          <span className={styles.led} />
          <span className={styles.led} />
        </div>
      )}

      {/* Screen content */}
      <div className={`${styles.screen} scanlines`}>{children}</div>

      {/* Bottom chrome */}
      <div className={styles.bottomBar}>
        <div className={styles.speaker}>
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={styles.speakerDot} />
          ))}
        </div>
      </div>
    </div>
  );
}
