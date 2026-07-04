import { useNavigate } from "react-router-dom";
import type { GameEntry } from "../games/registry";
import { loadScores } from "../lib/highScores";
import ScoreTable from "./ScoreTable";
import styles from "./GameCard.module.css";

interface Props {
  game: GameEntry;
}

const ACCENT_CLASS: Record<GameEntry["accent"], string> = {
  cyan: styles.accentCyan,
  green: styles.accentGreen,
};

export default function GameCard({ game }: Props) {
  const navigate = useNavigate();
  const entries = loadScores(game.id);

  const handlePlay = () => {
    if (game.status === "available") {
      navigate(game.route);
    }
  };

  return (
    <div
      className={`${styles.card} ${ACCENT_CLASS[game.accent]} ${game.status === "coming-soon" ? styles.comingSoon : ""}`}
    >
      {/* Preview area */}
      <div className={styles.preview}>
        <span className={styles.previewTitle}>{game.title}</span>
      </div>

      {/* Info area */}
      <div className={styles.info}>
        <h2 className={styles.title}>{game.title}</h2>
        <ScoreTable entries={entries.slice(0, 3)} />
      </div>

      {/* CTA */}
      <button
        className={styles.playBtn}
        onClick={handlePlay}
        disabled={game.status === "coming-soon"}
        aria-label={`Play ${game.title}`}
      >
        {game.status === "available" ? "▶ PLAY" : "COMING SOON"}
      </button>
    </div>
  );
}
