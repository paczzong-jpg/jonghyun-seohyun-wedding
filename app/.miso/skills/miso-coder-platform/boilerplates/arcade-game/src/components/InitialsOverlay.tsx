// ============================================================
// InitialsOverlay — appears after a qualifying game-over
// ============================================================

import { useEffect, useRef, useState, type FC } from "react";
import styles from "./InitialsOverlay.module.css";

interface Props {
  score: number;
  onSubmit: (initials: string) => void;
}

const SLOTS = [0, 1, 2] as const;

const InitialsOverlay: FC<Props> = ({ score, onSubmit }) => {
  const [chars, setChars] = useState<[string, string, string]>(["A", "A", "A"]);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Focus first slot on mount
  useEffect(() => {
    refs[0].current?.focus();
    refs[0].current?.select();
  }, []);

  const focusSlot = (i: number) => {
    refs[i]?.current?.focus();
    refs[i]?.current?.select();
  };

  const handleKeyDown =
    (i: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Always stop propagation so game controls don't fire
      e.stopPropagation();

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (i > 0) focusSlot(i - 1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (i < 2) focusSlot(i + 1);
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        const next = [...chars] as [string, string, string];
        if (chars[i] !== "_") {
          // Clear current slot, stay here
          next[i] = "_";
          setChars(next);
        } else if (i > 0) {
          // Already empty — move back and clear previous
          next[i - 1] = "_";
          setChars(next);
          focusSlot(i - 1);
        }
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
        return;
      }
    };

  const handleChange =
    (i: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!raw) return;
      const ch = raw[raw.length - 1]; // take last char (handles composition)
      const next = [...chars] as [string, string, string];
      next[i] = ch;
      setChars(next);
      // Advance to next slot
      if (i < 2) focusSlot(i + 1);
    };

  const handleSubmit = () => {
    const initials = chars.filter((c) => c !== "_").join("");
    if (initials.length === 0) return;
    onSubmit(initials);
  };

  const anyFilled = chars.some((c) => c !== "_");

  return (
    <div className={styles.overlay} onKeyDown={(e) => e.stopPropagation()}>
      <div className={styles.box}>
        <p className={styles.newHigh}>NEW HIGH SCORE!</p>
        <p className={styles.scoreValue}>{score.toLocaleString()}</p>

        <p className={styles.label}>ENTER YOUR INITIALS</p>
        <div className={styles.slots}>
          {SLOTS.map((i) => (
            <input
              key={i}
              ref={refs[i]}
              className={styles.slot}
              type="text"
              maxLength={2}
              value={chars[i]}
              onChange={handleChange(i)}
              onKeyDown={handleKeyDown(i)}
              onFocus={(e) => e.target.select()}
              autoComplete="off"
              spellCheck={false}
              aria-label={`Initial ${i + 1}`}
            />
          ))}
        </div>

        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!anyFilled}
        >
          ▶ SUBMIT
        </button>
      </div>
    </div>
  );
};

export default InitialsOverlay;
