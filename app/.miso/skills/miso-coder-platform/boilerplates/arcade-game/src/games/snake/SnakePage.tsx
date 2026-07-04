import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSnake } from "./useSnake";
import {
  CANVAS_W,
  CANVAS_H,
  CELL_SIZE,
  SNAKE_HEAD_COLOR,
  SNAKE_BODY_COLOR,
  FOOD_COLOR,
  GRID_COLOR,
} from "./constants";
import ArcadeScreen from "../../components/ArcadeScreen";
import InitialsOverlay from "../../components/InitialsOverlay";
import styles from "./SnakePage.module.css";

function resolveVar(v: string): string {
  if (!v.startsWith("var(")) return v;
  return getComputedStyle(document.documentElement)
    .getPropertyValue(v.slice(4, -1))
    .trim();
}

export default function SnakePage() {
  const navigate = useNavigate();
  const { state, start, restart, pauseToggle, pendingScore, submitInitials } =
    useSnake();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Render ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = GRID_COLOR;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle grid
    ctx.strokeStyle = "hsl(120 33% 8%)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= CANVAS_H / CELL_SIZE; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(CANVAS_W, r * CELL_SIZE);
      ctx.stroke();
    }
    for (let c = 0; c <= CANVAS_W / CELL_SIZE; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, CANVAS_H);
      ctx.stroke();
    }

    // Snake
    const headColor = resolveVar(SNAKE_HEAD_COLOR);
    state.snake.forEach(([r, c], i) => {
      const x = c * CELL_SIZE;
      const y = r * CELL_SIZE;
      const pad = 1;

      if (i === 0) {
        // Head — neon green, bright
        ctx.fillStyle = headColor;
        ctx.shadowColor = headColor;
        ctx.shadowBlur = 12;
        ctx.fillRect(
          x + pad,
          y + pad,
          CELL_SIZE - pad * 2,
          CELL_SIZE - pad * 2,
        );
        ctx.shadowBlur = 0;

        // Eyes
        const eyeSize = 3;
        ctx.fillStyle = "hsl(0 0% 0%)";
        if (state.direction === "RIGHT" || state.direction === "LEFT") {
          const ex = state.direction === "RIGHT" ? x + CELL_SIZE - 6 : x + 3;
          ctx.fillRect(ex, y + 3, eyeSize, eyeSize);
          ctx.fillRect(ex, y + CELL_SIZE - 6, eyeSize, eyeSize);
        } else {
          const ey = state.direction === "DOWN" ? y + CELL_SIZE - 6 : y + 3;
          ctx.fillRect(x + 3, ey, eyeSize, eyeSize);
          ctx.fillRect(x + CELL_SIZE - 6, ey, eyeSize, eyeSize);
        }
      } else {
        // Body — gradient from bright to dim based on position
        const ratio = i / state.snake.length;
        const alpha = Math.max(0.25, 1 - ratio * 0.65);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = SNAKE_BODY_COLOR;
        ctx.fillRect(
          x + pad,
          y + pad,
          CELL_SIZE - pad * 2,
          CELL_SIZE - pad * 2,
        );
        ctx.globalAlpha = 1;
      }
    });

    // Food — pulsing pink square
    const [fr, fc] = state.food;
    const foodColor = resolveVar(FOOD_COLOR);
    ctx.fillStyle = foodColor;
    ctx.shadowColor = foodColor;
    ctx.shadowBlur = 16;
    ctx.fillRect(
      fc * CELL_SIZE + 2,
      fr * CELL_SIZE + 2,
      CELL_SIZE - 4,
      CELL_SIZE - 4,
    );
    ctx.shadowBlur = 0;

    // Pause overlay
    if (state.status === "paused") {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "hsl(180 100% 50%)";
      ctx.font = '14px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", CANVAS_W / 2, CANVAS_H / 2 - 10);
      ctx.font = '7px "Press Start 2P"';
      ctx.fillStyle = "hsl(240 24% 73%)";
      ctx.fillText("PRESS P TO RESUME", CANVAS_W / 2, CANVAS_H / 2 + 16);
    }

    // Game over overlay
    if (state.status === "game-over") {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "hsl(345 100% 50%)";
      ctx.font = '14px "Press Start 2P"';
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 28);
      ctx.font = '7px "Press Start 2P"';
      ctx.fillStyle = "hsl(240 100% 94%)";
      ctx.fillText(`SCORE: ${state.score}`, CANVAS_W / 2, CANVAS_H / 2 + 4);
      ctx.fillStyle = "hsl(111 100% 54%)";
      ctx.fillText("ENTER TO RESTART", CANVAS_W / 2, CANVAS_H / 2 + 28);
    }
  }, [state]);

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* Left panel */}
        <div className={styles.leftPanel}>
          <button className={styles.backBtn} onClick={() => navigate("/")}>
            ← BACK
          </button>

          <div className={styles.statBlock}>
            <span className={styles.statLabel}>SCORE</span>
            <span className={styles.statValue}>{state.score}</span>
          </div>
          <div className={styles.statBlock}>
            <span className={styles.statLabel}>LEVEL</span>
            <span className={styles.statValue}>{state.level + 1}</span>
          </div>
          <div className={styles.statBlock}>
            <span className={styles.statLabel}>LENGTH</span>
            <span className={styles.statValue}>{state.snake.length}</span>
          </div>
          <div className={styles.statBlock}>
            <span className={styles.statLabel}>BEST</span>
            <span className={styles.statValueAlt}>{state.highScore}</span>
          </div>
        </div>

        {/* Main screen */}
        <ArcadeScreen title="SNAKE" accent="green">
          <div className={styles.canvasWrap}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className={styles.gameCanvas}
            />
            {state.status === "idle" && (
              <div className={styles.startOverlay}>
                <p className={styles.startTitle}>SNAKE</p>
                <p className={styles.startSub}>PRESS ENTER TO START</p>
                <button className={styles.startBtn} onClick={start}>
                  INSERT COIN
                </button>
              </div>
            )}
          </div>
        </ArcadeScreen>

        {/* Right panel */}
        <div className={styles.rightPanel}>
          <div className={styles.controls}>
            <p className={styles.controlsTitle}>CONTROLS</p>
            <ul className={styles.controlsList}>
              <li>
                <kbd>← → ↑ ↓</kbd> Move
              </li>
              <li>
                <kbd>WASD</kbd> Also move
              </li>
              <li>
                <kbd>P</kbd> Pause
              </li>
              <li>
                <kbd>ENTER</kbd> Start/Restart
              </li>
            </ul>
          </div>

          <div className={styles.tip}>
            <p className={styles.tipTitle}>TIP</p>
            <p className={styles.tipText}>
              Speed increases every {5} foods eaten!
            </p>
          </div>

          {(state.status === "playing" || state.status === "paused") && (
            <button className={styles.pauseBtn} onClick={pauseToggle}>
              {state.status === "paused" ? "▶ RESUME" : "⏸ PAUSE"}
            </button>
          )}

          {state.status === "game-over" && (
            <button className={styles.pauseBtn} onClick={restart}>
              ↺ RESTART
            </button>
          )}
        </div>
      </div>
      {pendingScore !== null && (
        <InitialsOverlay score={pendingScore} onSubmit={submitInitials} />
      )}
    </div>
  );
}
