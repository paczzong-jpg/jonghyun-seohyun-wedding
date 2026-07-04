// ============================================================
// Snake — Game Constants
// ============================================================

export const BOARD_COLS = 25;
export const BOARD_ROWS = 20;
export const CELL_SIZE = 20; // pixels per cell on canvas

export const CANVAS_W = BOARD_COLS * CELL_SIZE;
export const CANVAS_H = BOARD_ROWS * CELL_SIZE;

/** Starting length of the snake */
export const INITIAL_LENGTH = 4;

/** Base tick interval in ms (level 0) */
export const BASE_SPEED = 160;

/** ms shaved off per level */
export const SPEED_STEP = 12;

/** Minimum tick interval in ms */
export const MIN_SPEED = 60;

/** Food eaten per level-up */
export const FOOD_PER_LEVEL = 5;

/** Points per food eaten (multiplied by level + 1) */
export const POINTS_PER_FOOD = 10;

export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

export const DIR_DELTA: Record<Direction, [number, number]> = {
  UP: [-1, 0],
  DOWN: [1, 0],
  LEFT: [0, -1],
  RIGHT: [0, 1],
};

// Neon color palette for the snake body gradient
export const SNAKE_HEAD_COLOR = "var(--color-neon-green)";
export const SNAKE_BODY_COLOR = "hsl(107 100% 24%)";
export const FOOD_COLOR = "var(--color-neon-pink)";
export const GRID_COLOR = "hsl(120 27% 8%)";
