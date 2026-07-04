import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import {
  createInitialState,
  snakeReducer,
  getTickInterval,
  type SnakeState,
  type SnakeAction,
} from "./SnakeEngine";
import type { Direction } from "./constants";
import { loadScores, isTopScore, addScore } from "../../lib/highScores";

const GAME_ID = "snake";

interface UseSnakeReturn {
  state: SnakeState;
  dispatch: React.Dispatch<SnakeAction>;
  start: () => void;
  restart: () => void;
  pauseToggle: () => void;
  pendingScore: number | null;
  submitInitials: (initials: string) => void;
}

export function useSnake(): UseSnakeReturn {
  const [state, dispatch] = useReducer(snakeReducer, undefined, () =>
    createInitialState(loadScores(GAME_ID)[0]?.score ?? 0),
  );

  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  pendingRef.current = pendingScore;

  // Keep a ref so the RAF loop always reads the latest state without re-subscribing
  const stateRef = useRef(state);
  stateRef.current = state;
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const gameLoop = useCallback((timestamp: number) => {
    const s = stateRef.current;
    if (s.status === "playing") {
      const interval = getTickInterval(s.level);
      if (timestamp - lastTickRef.current >= interval) {
        dispatch({ type: "TICK" });
        lastTickRef.current = timestamp;
      }
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
    const DIR_MAP: Record<string, Direction> = {
      ArrowUp: "UP",
      ArrowDown: "DOWN",
      ArrowLeft: "LEFT",
      ArrowRight: "RIGHT",
      w: "UP",
      W: "UP",
      s: "DOWN",
      S: "DOWN",
      a: "LEFT",
      A: "LEFT",
      d: "RIGHT",
      D: "RIGHT",
    };

    const handleKey = (e: KeyboardEvent) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      ) {
        e.preventDefault();
      }

      const dir = DIR_MAP[e.key];
      if (dir) {
        dispatch({ type: "CHANGE_DIRECTION", direction: dir });
        return;
      }

      switch (e.key) {
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
