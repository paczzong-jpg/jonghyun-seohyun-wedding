// ============================================================
// Arcade Hub — Per-game high score persistence (localStorage)
// ============================================================

export interface HighScoreEntry {
  initials: string;
  score: number;
}

const MAX_ENTRIES = 5;

function storageKey(gameId: string): string {
  return `arcade-hs-${gameId}`;
}

/** Load the sorted leaderboard for a game (best first). Returns [] on first run. */
export function loadScores(gameId: string): HighScoreEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HighScoreEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e) =>
          typeof e.score === "number" &&
          typeof e.initials === "string" &&
          e.score >= 0,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/**
 * Returns true when `score` is > 0 and would enter (or tie for) the top-5 list.
 * A qualifying score means the initials prompt should be shown.
 */
export function isTopScore(gameId: string, score: number): boolean {
  if (score <= 0) return false;
  const existing = loadScores(gameId);
  if (existing.length < MAX_ENTRIES) return true;
  return score >= existing[existing.length - 1].score;
}

/**
 * Insert a new entry, keep best MAX_ENTRIES, persist, and return the updated list.
 * Initials are uppercased, stripped of non-alphanumeric chars, and capped at 3 chars.
 */
export function addScore(
  gameId: string,
  score: number,
  initials: string,
): HighScoreEntry[] {
  const clean = initials
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);

  if (clean.length === 0) {
    return loadScores(gameId);
  }

  const existing = loadScores(gameId);
  const updated: HighScoreEntry[] = [...existing, { initials: clean, score }]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ENTRIES);

  try {
    localStorage.setItem(storageKey(gameId), JSON.stringify(updated));
  } catch {
    // Silently swallow storage errors (private browsing, quota exceeded)
  }

  return updated;
}
