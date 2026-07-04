// ============================================================
// Tetris — Game Constants
// ============================================================

export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;
export const CELL_SIZE = 30; // pixels per cell on canvas

// Milliseconds per automatic drop at each level (index = level, capped at 29)
export const LEVEL_SPEEDS: number[] = [
  800, 720, 630, 550, 470, 380, 300, 220, 140, 100,
  // level 10+
  80, 80, 80, 70, 70, 70, 50, 50, 50, 30,
  // level 20+
  30, 30, 30, 20, 20, 20, 15, 15, 10, 10,
];

// Lines needed to advance to the next level
export const LINES_PER_LEVEL = 10;

// Score awarded for clearing n lines at once (multiplied by level+1)
export const LINE_SCORE: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

// ── Tetromino Definitions ──────────────────────────────────
// Each shape is an array of 4 [row, col] offsets from an origin cell.
export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

/** A single rotation state — array of [row, col] offsets */
export type Shape = [number, number][];

/** All four rotation states for a piece */
export type PieceRotations = [Shape, Shape, Shape, Shape];

export const TETROMINOES: Record<TetrominoType, PieceRotations> = {
  I: [
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  ],
  O: [
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
  ],
  T: [
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  S: [
    [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ],
    [
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  ],
  Z: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ],
  ],
  J: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 0],
      [2, 1],
    ],
  ],
  L: [
    [
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
    ],
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  ],
};

export const PIECE_COLORS: Record<TetrominoType, string> = {
  I: "var(--tet-I)",
  O: "var(--tet-O)",
  T: "var(--tet-T)",
  S: "var(--tet-S)",
  Z: "var(--tet-Z)",
  J: "var(--tet-J)",
  L: "var(--tet-L)",
};

export const PIECE_TYPES: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];
