// ============================================================
// Snake — Pure Game Logic Engine (no React dependencies)
// ============================================================

import {
  BOARD_COLS,
  BOARD_ROWS,
  INITIAL_LENGTH,
  BASE_SPEED,
  SPEED_STEP,
  MIN_SPEED,
  FOOD_PER_LEVEL,
  POINTS_PER_FOOD,
  OPPOSITE,
  DIR_DELTA,
  type Direction,
} from "./constants";

// ── Types ─────────────────────────────────────────────────

export type Cell = [number, number]; // [row, col]

export interface SnakeState {
  /** Ordered list of cells: index 0 = head */
  snake: Cell[];
  food: Cell;
  direction: Direction;
  /** Buffered next direction (applied on next tick) */
  nextDirection: Direction;
  score: number;
  foodEaten: number;
  level: number;
  highScore: number;
  status: "idle" | "playing" | "paused" | "game-over";
}

// ── Helpers ───────────────────────────────────────────────

function randomFood(snake: Cell[]): Cell {
  const occupied = new Set(snake.map(([r, c]) => `${r},${c}`));
  let cell: Cell;
  do {
    cell = [
      Math.floor(Math.random() * BOARD_ROWS),
      Math.floor(Math.random() * BOARD_COLS),
    ];
  } while (occupied.has(`${cell[0]},${cell[1]}`));
  return cell;
}

function buildInitialSnake(): Cell[] {
  const startRow = Math.floor(BOARD_ROWS / 2);
  const startCol = Math.floor(BOARD_COLS / 2);
  // Snake starts horizontal, moving right, head on the right
  return Array.from(
    { length: INITIAL_LENGTH },
    (_, i) => [startRow, startCol - i] as Cell,
  );
}

export function createInitialState(savedHighScore = 0): SnakeState {
  const snake = buildInitialSnake();
  return {
    snake,
    food: randomFood(snake),
    direction: "RIGHT",
    nextDirection: "RIGHT",
    score: 0,
    foodEaten: 0,
    level: 0,
    highScore: savedHighScore,
    status: "idle",
  };
}

/** Get the current drop interval in ms for a given level */
export function getTickInterval(level: number): number {
  return Math.max(MIN_SPEED, BASE_SPEED - level * SPEED_STEP);
}

// ── Actions ───────────────────────────────────────────────

export type SnakeAction =
  | { type: "START" }
  | { type: "RESTART" }
  | { type: "PAUSE_TOGGLE" }
  | { type: "CHANGE_DIRECTION"; direction: Direction }
  | { type: "TICK" };

// ── Reducer ───────────────────────────────────────────────

export function snakeReducer(
  state: SnakeState,
  action: SnakeAction,
): SnakeState {
  switch (action.type) {
    case "START":
      return { ...state, status: "playing" };

    case "RESTART": {
      const snake = buildInitialSnake();
      return {
        snake,
        food: randomFood(snake),
        direction: "RIGHT",
        nextDirection: "RIGHT",
        score: 0,
        foodEaten: 0,
        level: 0,
        highScore: state.highScore,
        status: "playing",
      };
    }

    case "PAUSE_TOGGLE":
      if (state.status === "playing") return { ...state, status: "paused" };
      if (state.status === "paused") return { ...state, status: "playing" };
      return state;

    case "CHANGE_DIRECTION": {
      if (state.status !== "playing") return state;
      // Ignore 180° reversal
      if (action.direction === OPPOSITE[state.direction]) return state;
      return { ...state, nextDirection: action.direction };
    }

    case "TICK": {
      if (state.status !== "playing") return state;

      const dir = state.nextDirection;
      const [dr, dc] = DIR_DELTA[dir];
      const [headRow, headCol] = state.snake[0];
      const newHead: Cell = [headRow + dr, headCol + dc];

      // Wall collision
      if (
        newHead[0] < 0 ||
        newHead[0] >= BOARD_ROWS ||
        newHead[1] < 0 ||
        newHead[1] >= BOARD_COLS
      ) {
        return {
          ...state,
          direction: dir,
          highScore: Math.max(state.score, state.highScore),
          status: "game-over",
        };
      }

      // Self collision (ignore tail tip — it will move away)
      const bodyWithoutTail = state.snake.slice(0, -1);
      if (
        bodyWithoutTail.some(([r, c]) => r === newHead[0] && c === newHead[1])
      ) {
        return {
          ...state,
          direction: dir,
          highScore: Math.max(state.score, state.highScore),
          status: "game-over",
        };
      }

      const ateFood =
        newHead[0] === state.food[0] && newHead[1] === state.food[1];

      // Grow if ate food, otherwise drop tail
      const newSnake: Cell[] = ateFood
        ? [newHead, ...state.snake]
        : [newHead, ...state.snake.slice(0, -1)];

      if (!ateFood) {
        return { ...state, snake: newSnake, direction: dir };
      }

      // Ate food — update score / level
      const newFoodEaten = state.foodEaten + 1;
      const newLevel = Math.floor(newFoodEaten / FOOD_PER_LEVEL);
      const newScore = state.score + POINTS_PER_FOOD * (state.level + 1);

      return {
        ...state,
        snake: newSnake,
        food: randomFood(newSnake),
        direction: dir,
        foodEaten: newFoodEaten,
        level: newLevel,
        score: newScore,
      };
    }

    default:
      return state;
  }
}
