// ============================================================
// ScoreTable — compact top-score list used in GameCard
// ============================================================

import type { FC } from "react";
import type { HighScoreEntry } from "../lib/highScores";
import styles from "./ScoreTable.module.css";

interface Props {
  entries: HighScoreEntry[];
  /** Max rows to render (default 3) */
  maxRows?: number;
}

const EMPTY_ENTRY: HighScoreEntry = { initials: "---", score: 0 };

const ScoreTable: FC<Props> = ({ entries, maxRows = 3 }) => {
  const rows: HighScoreEntry[] = Array.from(
    { length: maxRows },
    (_, i) => entries[i] ?? EMPTY_ENTRY,
  );

  return (
    <div className={styles.table}>
      <p className={styles.heading}>TOP SCORES</p>
      {rows.map((entry, i) => (
        <div
          key={i}
          className={`${styles.row} ${entry.initials === "---" ? styles.empty : ""}`}
        >
          <span className={styles.rank}>#{i + 1}</span>
          <span className={styles.initials}>{entry.initials}</span>
          <span className={styles.score}>
            {entry.initials === "---" ? "-----" : entry.score.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ScoreTable;
