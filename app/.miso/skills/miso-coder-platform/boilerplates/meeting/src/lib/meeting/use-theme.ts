import { useEffect, useState } from "react";

const STORAGE_KEY = "mn-theme";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** 다크모드 토글 — .dark 클래스 + localStorage, 최초엔 시스템 설정 */
export function useTheme(): { dark: boolean; toggle: () => void } {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return systemPrefersDark();
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark((v) => !v) };
}
