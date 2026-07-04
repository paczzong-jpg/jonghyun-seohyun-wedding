# arcade-game (boilerplate)

Vite React arcade game hub overlay. This boilerplate ports completed browser games from a public-domain GitHub project instead of using scratch placeholder games.

## Source And License Gate

Port source:

- Repository: `https://github.com/ken-mellem/arcade`
- Checked commit: `1ae6839f2f9d6088c1e63144fa1d6a010683a468`
- Upstream license: Unlicense / public domain
- Copied license files: none

Why this source is allowed:

- The upstream `LICENSE` dedicates the software to the public domain.
- No third-party game sprites, sounds, maps, ripped assets, or famous-IP media are copied.
- The port keeps code-native canvas/vector rendering only.
- The MISO repo does not add a third-party license file for this boilerplate.

Rejected sources during selection:

- `straker` Basic HTML Games: CC0, but the author states they are intentionally basic outlines with missing features.
- `gingeleski/block-rain`: Unlicense, but it vendors jQuery, Modernizr, Foundation, and old standalone HTML/CSS structure.
- MIT/Apache/BSD games: excluded because they require notice/license preservation.
- Famous-IP clones with ripped assets: excluded even when the repository license is permissive.

## Included Games

- `Tetris`: falling block puzzle with hold, next preview, ghost piece, scoring, levels, pause, restart, and high-score initials.
- `Snake`: grid snake game with WASD/arrow controls, speed progression, scoring, pause, restart, and high-score initials.

Upstream also includes other games, but this boilerplate intentionally starts with the two that stay inside the MISO Coder template constraints without oversized files or extra dependency churn.

## File Structure

```text
src/App.tsx

src/components/
  ArcadeScreen.tsx
  GameCard.tsx
  InitialsOverlay.tsx
  ScoreTable.tsx
  *.module.css

src/games/
  registry.ts
  snake/*
  tetris/*

src/lib/
  highScores.ts

src/pages/
  LandingPage.tsx

src/styles/
  globals.css
  theme.css
```

## Overlay Usage

Copy only this boilerplate's `src/` folder into a generated app. Do not copy upstream package files, lockfiles, license files, `.github`, prompts, or project metadata.

```text
boilerplates/arcade-game/src/App.tsx -> src/App.tsx
boilerplates/arcade-game/src/components/* -> src/components/*
boilerplates/arcade-game/src/games/* -> src/games/*
boilerplates/arcade-game/src/lib/highScores.ts -> src/lib/highScores.ts
boilerplates/arcade-game/src/pages/* -> src/pages/*
boilerplates/arcade-game/src/styles/* -> src/styles/*
```

## MISO Adaptations

- `App.tsx` wraps routes in `BrowserRouter` because the base Coder template `main.tsx` renders only `App`.
- Upstream inline CSS-variable styles were replaced with CSS module accent classes.
- Hex color literals were converted to HSL strings to satisfy the MISO boilerplate contract.
- Space Invaders and Asteroids were not copied into the default overlay.
- No new npm dependencies are required.

## Multiplayer Extension

This boilerplate is browser-only and publish-safe. For realtime multiplayer:

1. Keep game logic deterministic and local.
2. Add room/player/state collections through `recipes/pocketbase/realtime/README.md`.
3. Sync player input or coarse room state through PocketBase realtime.
4. For QR/event-driven sessions, reuse `event-app/README.md` patterns for join codes, host controls, and scoreboards.

## Verification

- Run `pnpm build` after applying the overlay.
- Open `/`, `/games/tetris`, and `/games/snake`.
- Confirm keyboard input, pause, restart, high-score initials, and localStorage score persistence.
