import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import {
  createInitialState,
  tetrisReducer,
  getDropInterval,
  type TetrisState,
  type TetrisAction,
} from "./TetrisEngine";
import { loadScores, isTopScore, addScore } from "../../lib/highScores";

const GAME_ID = "tetris";

interface UseTetrisReturn {
  state: TetrisState;
  dispatch: React.Dispatch<TetrisAction>;
  start: () => void;
  restart: () => void;
  pauseToggle: () => void;
  pendingScore: number | null;
  submitInitials: (initials: string) => void;
}

export function useTetris(): UseTetrisReturn {
  const [state, dispatch] = useReducer(tetrisReducer, undefined, () =>
    createInitialState(loadScores(GAME_ID)[0]?.score ?? 0),
  );

  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  pendingRef.current = pendingScore;

  // ── Game loop ──────────────────────────────────────────
  const stateRef = useRef(state);
  stateRef.current = state;
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const gameLoop = useCallback((timestamp: number) => {
    const s = stateRef.current;
    if (s.status !== "playing") {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const interval = getDropInterval(s.level);
    if (timestamp - lastTickRef.current >= interval) {
      dispatch({ type: "TICK" });
      lastTickRef.current = timestamp;
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [gameLoop]);

  // ── Keyboard input ─────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Prevent default browser scroll for game keys
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)
      ) {
        e.preventDefault();
      }

      switch (e.key) {
        case "ArrowLeft":
          dispatch({ type: "MOVE_LEFT" });
          break;
        case "ArrowRight":
          dispatch({ type: "MOVE_RIGHT" });
          break;
        case "ArrowUp":
          dispatch({ type: "ROTATE" });
          break;
        case "ArrowDown":
          dispatch({ type: "SOFT_DROP" });
          break;
        case " ":
          dispatch({ type: "HARD_DROP" });
          break;
        case "c":
        case "C":
          dispatch({ type: "HOLD" });
          break;
        case "p":
        case "P":
          dispatch({ type: "PAUSE_TOGGLE" });
          break;
        case "Enter": {
          const s = stateRef.current;
          if (s.status === "idle") dispatch({ type: "START" });
          else if (s.status === "game-over" && pendingRef.current === null)
            dispatch({ type: "RESTART" });
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const start = useCallback(() => dispatch({ type: "START" }), []);
  const restart = useCallback(() => dispatch({ type: "RESTART" }), []);
  const pauseToggle = useCallback(() => dispatch({ type: "PAUSE_TOGGLE" }), []);

  // Detect qualifying game-over and prompt for initials
  useEffect(() => {
    if (state.status === "game-over" && isTopScore(GAME_ID, state.score)) {
      setPendingScore(state.score);
    }
  }, [state.status, state.score]);

  const submitInitials = useCallback((initials: string) => {
    if (pendingRef.current === null) return;
    const score = pendingRef.current;
    pendingRef.current = null; // guard: prevent double-invocation before re-render
    addScore(GAME_ID, score, initials);
    setPendingScore(null);
    dispatch({ type: "RESTART" });
  }, []);

  return {
    state,
    dispatch,
    start,
    restart,
    pauseToggle,
    pendingScore,
    submitInitials,
  };
}
