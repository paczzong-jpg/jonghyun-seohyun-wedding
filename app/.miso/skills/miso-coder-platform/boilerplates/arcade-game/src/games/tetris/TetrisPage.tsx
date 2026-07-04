import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTetris } from "./useTetris";
import { getPieceCells, getGhostPiece } from "./TetrisEngine";
import {
  BOARD_COLS,
  BOARD_ROWS,
  CELL_SIZE,
  TETROMINOES,
  PIECE_COLORS,
  type TetrominoType,
} from "./constants";
import ArcadeScreen from "../../components/ArcadeScreen";
import InitialsOverlay from "../../components/InitialsOverlay";
import styles from "./TetrisPage.module.css";

// ── Canvas drawing helpers ──────────────────────────────────

const CANVAS_W = BOARD_COLS * CELL_SIZE;
const CANVAS_H = BOARD_ROWS * CELL_SIZE;
const PREVIEW_SIZE = 4 * CELL_SIZE;

function resolveCssVar(varName: string): string {
  // Resolve CSS custom property to a computed color value
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName.replace("var(", "").replace(")", ""))
    .trim();
}

function resolveColor(color: string): string {
  if (color.startsWith("var(")) return resolveCssVar(color);
  return color;
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  r: number,
  c: number,
  rawColor: string,
  alpha = 1,
  size = CELL_SIZE,
  offsetX = 0,
  offsetY = 0,
) {
  const color = resolveColor(rawColor);
  const x = offsetX + c * size;
  const y = offsetY + r * size;
  const pad = 1;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

  // Highlight edge
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x + pad, y + pad, size - pad * 2, 3);
  ctx.fillRect(x + pad, y + pad, 3, size - pad * 2);

  // Shadow edge
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(x + pad, y + size - pad - 3, size - pad * 2, 3);
  ctx.fillRect(x + size - pad - 3, y + pad, 3, size - pad * 2);

  ctx.globalAlpha = 1;
}

function drawPiecePreview(
  ctx: CanvasRenderingContext2D,
  type: TetrominoType | null,
  x: number,
  y: number,
  size: number,
) {
  if (!type) return;
  const color = PIECE_COLORS[type];
  const shape = TETROMINOES[type][0];
  // Center in preview box
  const minR = Math.min(...shape.map(([r]) => r));
  const maxR = Math.max(...shape.map(([r]) => r));
  const minC = Math.min(...shape.map(([, c]) => c));
  const maxC = Math.max(...shape.map(([, c]) => c));
  const cellW = size / 4;
  const totalW = (maxC - minC + 1) * cellW;
  const totalH = (maxR - minR + 1) * cellW;
  const startX = x + (size - totalW) / 2;
  const startY = y + (size - totalH) / 2;

  for (const [dr, dc] of shape) {
    drawCell(ctx, dr - minR, dc - minC, color, 1, cellW, startX, startY);
  }
}

// ── Component ───────────────────────────────────────────────

export default function TetrisPage() {
  const navigate = useNavigate();
  const { state, start, restart, pauseToggle, pendingScore, submitInitials } =
    useTetris();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Render loop ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background fill
    ctx.fillStyle = "hsl(240 20% 5%)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid lines
    ctx.strokeStyle = "hsl(240 31% 13%)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= BOARD_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_SIZE);
      ctx.lineTo(CANVAS_W, r * CELL_SIZE);
      ctx.stroke();
    }
    for (let c = 0; c <= BOARD_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_SIZE, 0);
      ctx.lineTo(c * CELL_SIZE, CANVAS_H);
      ctx.stroke();
    }

    // Locked cells
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const cell = state.board[r][c];
        if (cell) drawCell(ctx, r, c, cell);
      }
    }

    // Ghost piece
    if (state.active && state.status === "playing") {
      const ghost = getGhostPiece(state.board, state.active);
      for (const [r, c] of getPieceCells(ghost)) {
        drawCell(ctx, r, c, PIECE_COLORS[state.active.type], 0.2);
      }
    }

    // Active piece
    if (state.active) {
      for (const [r, c] of getPieceCells(state.active)) {
        drawCell(ctx, r, c, PIECE_COLORS[state.active.type]);
      }
    }

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
      ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 24);
      ctx.font = '7px "Press Start 2P"';
      ctx.fillStyle = "hsl(240 100% 94%)";
      ctx.fillText(`SCORE: ${state.score}`, CANVAS_W / 2, CANVAS_H / 2 + 4);
      ctx.fillStyle = "hsl(111 100% 54%)";
      ctx.fillText("ENTER TO RESTART", CANVAS_W / 2, CANVAS_H / 2 + 28);
    }
  }, [state]);

  // ── HUD panel canvas (next + held) ───────────────────────
  const hudRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = hudRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = PREVIEW_SIZE + 20;
    const H = PREVIEW_SIZE * 2 + 60;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "hsl(240 20% 5%)";
    ctx.fillRect(0, 0, W, H);

    // "NEXT" label
    ctx.fillStyle = "hsl(180 100% 50%)";
    ctx.font = '6px "Press Start 2P"';
    ctx.textAlign = "left";
    ctx.fillText("NEXT", 10, 14);
    drawPiecePreview(ctx, state.next, 10, 18, PREVIEW_SIZE);

    // "HOLD" label
    ctx.fillStyle = "hsl(300 100% 50%)";
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText("HOLD", 10, 18 + PREVIEW_SIZE + 24);
    drawPiecePreview(ctx, state.held, 10, 18 + PREVIEW_SIZE + 28, PREVIEW_SIZE);
  }, [state.next, state.held]);

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* Left HUD */}
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
            <span className={styles.statLabel}>LINES</span>
            <span className={styles.statValue}>{state.lines}</span>
          </div>
          <div className={styles.statBlock}>
            <span className={styles.statLabel}>BEST</span>
            <span className={styles.statValueAlt}>{state.highScore}</span>
          </div>
        </div>

        {/* Main game screen */}
        <ArcadeScreen title="TETRIS" accent="cyan">
          <div className={styles.canvasWrap}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className={styles.gameCanvas}
            />
            {state.status === "idle" && (
              <div className={styles.startOverlay}>
                <p className={styles.startTitle}>TETRIS</p>
                <p className={styles.startSub}>PRESS ENTER TO START</p>
                <button className={styles.startBtn} onClick={start}>
                  INSERT COIN
                </button>
              </div>
            )}
          </div>
        </ArcadeScreen>

        {/* Right HUD — queue, hold, and controls */}
        <div className={styles.rightPanel}>
          <canvas
            ref={hudRef}
            width={PREVIEW_SIZE + 20}
            height={PREVIEW_SIZE * 2 + 60}
            className={styles.hudCanvas}
          />

          <div className={styles.controls}>
            <p className={styles.controlsTitle}>CONTROLS</p>
            <ul className={styles.controlsList}>
              <li>
                <kbd>←→</kbd> Move
              </li>
              <li>
                <kbd>↑</kbd> Rotate
              </li>
              <li>
                <kbd>↓</kbd> Soft drop
              </li>
              <li>
                <kbd>SPACE</kbd> Hard drop
              </li>
              <li>
                <kbd>C</kbd> Hold
              </li>
              <li>
                <kbd>P</kbd> Pause
              </li>
              <li>
                <kbd>ENTER</kbd> Start/Restart
              </li>
            </ul>
          </div>

          {state.status === "playing" || state.status === "paused" ? (
            <button className={styles.pauseBtn} onClick={pauseToggle}>
              {state.status === "paused" ? "▶ RESUME" : "⏸ PAUSE"}
            </button>
          ) : null}

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
