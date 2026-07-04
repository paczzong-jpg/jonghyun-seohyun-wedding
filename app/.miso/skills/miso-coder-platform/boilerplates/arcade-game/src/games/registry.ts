export interface GameEntry {
  id: string;
  title: string;
  description: string;
  route: string;
  accent: "cyan" | "green";
  status: "available" | "coming-soon";
  /** Short comma-separated list of controls shown on the card */
  controls: string;
}

export const GAMES: GameEntry[] = [
  {
    id: "tetris",
    title: "TETRIS",
    description: "Stack falling tetrominoes, clear lines, survive the speed.",
    route: "/games/tetris",
    accent: "cyan",
    status: "available",
    controls: "← → rotate ↑  drop ↓  pause P",
  },
  {
    id: "snake",
    title: "SNAKE",
    description:
      "Eat, grow, and don't bite yourself. Speed up with every meal.",
    route: "/games/snake",
    accent: "green",
    status: "available",
    controls: "← → ↑ ↓  or  WASD  pause P",
  },
];
