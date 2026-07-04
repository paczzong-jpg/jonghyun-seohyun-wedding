// ============================================================
// Tetris — Pure Game Logic Engine (no React dependencies)
// ============================================================

import {
  BOARD_COLS,
  BOARD_ROWS,
  LEVEL_SPEEDS,
  LINES_PER_LEVEL,
  LINE_SCORE,
  PIECE_TYPES,
  PIECE_COLORS,
  TETROMINOES,
  type TetrominoType,
  type Shape,
} from "./constants";

// ── Types ─────────────────────────────────────────────────

/** A cell on the board: null = empty, string = color value */
export type BoardCell = string | null;

/** 2D board: rows × cols */
export type Board = BoardCell[][];

export interface ActivePiece {
  type: TetrominoType;
  rotation: 0 | 1 | 2 | 3;
  row: number;
  col: number;
}

export interface TetrisState {
  board: Board;
  active: ActivePiece | null;
  next: TetrominoType;
  held: TetrominoType | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  highScore: number;
  status: "idle" | "playing" | "paused" | "game-over";
  lockDelay: number; // countdown ticks remaining before lock
}

// ── Helpers ───────────────────────────────────────────────

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

function randomPiece(): TetrominoType {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

function getShape(piece: ActivePiece): Shape {
  return TETROMINOES[piece.type][piece.rotation];
}

/** Returns absolute [row, col] cells occupied by the piece */
export function getPieceCells(piece: ActivePiece): [number, number][] {
  return getShape(piece).map(([dr, dc]) => [piece.row + dr, piece.col + dc]);
}

/** Check if a piece position is valid on the given board */
export function isValidPosition(board: Board, piece: ActivePiece): boolean {
  for (const [r, c] of getPieceCells(piece)) {
    if (r < 0 || r >= BOARD_ROWS) return false;
    if (c < 0 || c >= BOARD_COLS) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

/** Compute the ghost (shadow) piece position */
export function getGhostPiece(board: Board, piece: ActivePiece): ActivePiece {
  let ghost = { ...piece };
  while (isValidPosition(board, { ...ghost, row: ghost.row + 1 })) {
    ghost = { ...ghost, row: ghost.row + 1 };
  }
  return ghost;
}

/** Lock the active piece onto the board */
function lockPiece(board: Board, piece: ActivePiece): Board {
  const next = board.map((row) => [...row]);
  const color = PIECE_COLORS[piece.type];
  for (const [r, c] of getPieceCells(piece)) {
    if (r >= 0) next[r][c] = color;
  }
  return next;
}

/** Clear completed lines, return new board + count cleared */
function clearLines(board: Board): { board: Board; cleared: number } {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = BOARD_ROWS - remaining.length;
  const newRows = Array.from({ length: cleared }, () =>
    Array(BOARD_COLS).fill(null),
  );
  return { board: [...newRows, ...remaining], cleared };
}

/** Spawn a new active piece at the top */
function spawnPiece(type: TetrominoType): ActivePiece {
  return {
    type,
    rotation: 0,
    row: 0,
    col: Math.floor(BOARD_COLS / 2) - 2,
  };
}

// ── Initial State ──────────────────────────────────────────

export function createInitialState(savedHighScore = 0): TetrisState {
  return {
    board: createEmptyBoard(),
    active: null,
    next: randomPiece(),
    held: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 0,
    highScore: savedHighScore,
    status: "idle",
    lockDelay: 0,
  };
}

// ── Reducer Actions ────────────────────────────────────────

export type TetrisAction =
  | { type: "START" }
  | { type: "PAUSE_TOGGLE" }
  | { type: "MOVE_LEFT" }
  | { type: "MOVE_RIGHT" }
  | { type: "ROTATE" }
  | { type: "SOFT_DROP" }
  | { type: "HARD_DROP" }
  | { type: "HOLD" }
  | { type: "TICK" }
  | { type: "RESTART" };

export function tetrisReducer(
  state: TetrisState,
  action: TetrisAction,
): TetrisState {
  switch (action.type) {
    case "START": {
      const active = spawnPiece(state.next);
      return {
        ...state,
        active,
        next: randomPiece(),
        status: "playing",
      };
    }

    case "RESTART":
      return {
        ...createInitialState(),
        highScore: state.highScore,
        status: "playing",
        active: spawnPiece(randomPiece()),
        next: randomPiece(),
      };

    case "PAUSE_TOGGLE":
      if (state.status === "playing") return { ...state, status: "paused" };
      if (state.status === "paused") return { ...state, status: "playing" };
      return state;

    case "MOVE_LEFT": {
      if (!state.active || state.status !== "playing") return state;
      const moved = { ...state.active, col: state.active.col - 1 };
      if (!isValidPosition(state.board, moved)) return state;
      return { ...state, active: moved };
    }

    case "MOVE_RIGHT": {
      if (!state.active || state.status !== "playing") return state;
      const moved = { ...state.active, col: state.active.col + 1 };
      if (!isValidPosition(state.board, moved)) return state;
      return { ...state, active: moved };
    }

    case "ROTATE": {
      if (!state.active || state.status !== "playing") return state;
      const nextRot = ((state.active.rotation + 1) % 4) as 0 | 1 | 2 | 3;
      const rotated = { ...state.active, rotation: nextRot };

      // Wall-kick attempts: try offsets [0, -1, +1, -2, +2]
      for (const offset of [0, -1, 1, -2, 2]) {
        const kicked = { ...rotated, col: rotated.col + offset };
        if (isValidPosition(state.board, kicked)) {
          return { ...state, active: kicked };
        }
      }
      return state;
    }

    case "SOFT_DROP": {
      if (!state.active || state.status !== "playing") return state;
      const moved = { ...state.active, row: state.active.row + 1 };
      if (!isValidPosition(state.board, moved)) return state;
      return { ...state, active: moved, score: state.score + 1 };
    }

    case "HARD_DROP": {
      if (!state.active || state.status !== "playing") return state;
      const ghost = getGhostPiece(state.board, state.active);
      const dropped = { ...state.active, row: ghost.row };
      const dropDistance = ghost.row - state.active.row;
      return lockAndSpawn({
        ...state,
        active: dropped,
        score: state.score + dropDistance * 2,
      });
    }

    case "HOLD": {
      if (!state.active || state.status !== "playing" || !state.canHold)
        return state;
      const heldType = state.held;
      const newHeld = state.active.type;
      const newActive = heldType
        ? spawnPiece(heldType)
        : spawnPiece(state.next);
      const newNext = heldType ? state.next : randomPiece();
      if (!isValidPosition(state.board, newActive))
        return {
          ...state,
          highScore: Math.max(state.highScore, state.score),
          status: "game-over",
        };
      return {
        ...state,
        active: newActive,
        held: newHeld,
        next: newNext,
        canHold: false,
      };
    }

    case "TICK": {
      if (!state.active || state.status !== "playing") return state;
      const moved = { ...state.active, row: state.active.row + 1 };
      if (isValidPosition(state.board, moved)) {
        return { ...state, active: moved };
      }
      // Cannot move down — lock
      return lockAndSpawn(state);
    }

    default:
      return state;
  }
}

/** Lock current piece, clear lines, spawn next, check game over */
function lockAndSpawn(state: TetrisState): TetrisState {
  if (!state.active) return state;

  const lockedBoard = lockPiece(state.board, state.active);
  const { board: clearedBoard, cleared } = clearLines(lockedBoard);

  const newLines = state.lines + cleared;
  const newLevel = Math.floor(newLines / LINES_PER_LEVEL);
  const scoreGain =
    cleared > 0 ? (LINE_SCORE[cleared] ?? 0) * (state.level + 1) : 0;
  const newScore = state.score + scoreGain;

  const newActive = spawnPiece(state.next);
  const newNext = randomPiece();

  // Game over if spawn location is blocked
  if (!isValidPosition(clearedBoard, newActive)) {
    return {
      ...state,
      board: clearedBoard,
      active: null,
      score: newScore,
      lines: newLines,
      level: newLevel,
      highScore: Math.max(state.highScore, newScore),
      status: "game-over",
    };
  }

  return {
    ...state,
    board: clearedBoard,
    active: newActive,
    next: newNext,
    canHold: true,
    score: newScore,
    lines: newLines,
    level: newLevel,
    status: "playing",
  };
}

/** Get the drop interval in ms for a given level */
export function getDropInterval(level: number): number {
  return LEVEL_SPEEDS[Math.min(level, LEVEL_SPEEDS.length - 1)];
}
