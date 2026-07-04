import { GAMES } from "../games/registry";
import GameCard from "../components/GameCard";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
  return (
    <div className={`page-scrollable ${styles.page}`}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.logo}>
            <span className="neon-green">ARCADE HUB</span>
          </h1>
          <p className={styles.tagline}>SELECT YOUR GAME</p>
        </div>
      </header>

      {/* Game grid */}
      <main className={styles.main}>
        <div className={styles.grid}>
          {GAMES.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>AGENTIC TESTING PURPOSES</span>
        <span className={styles.blink}>□</span>
      </footer>
    </div>
  );
}
