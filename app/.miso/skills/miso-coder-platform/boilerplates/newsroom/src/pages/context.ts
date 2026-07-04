import { useOutletContext } from "react-router-dom";
import type { Article, Cluster, CitationRef, Settings, Source, Topic } from "@/lib/news/types";

// ────────────────────────────────────────────────
// 라우트 전역 컨텍스트 — RootLayout(App.tsx)이 코퍼스·구독·설정을 한 번 적재해
// Outlet 으로 내려준다. 페이지는 useNews() 로만 접근한다.
//   · App → pages 단방향 import 를 유지하려고 별도 모듈로 분리(순환 import 방지)
// ────────────────────────────────────────────────

export interface NewsContext {
  articles: Article[];
  clusters: Cluster[];
  topics: Topic[];
  sources: Source[];
  settings: Settings | null;
  readSet: Set<string>;
  keywords: string[];
  booting: boolean;
  refreshCorpus: () => void;
  refreshTopics: () => Promise<void>;
  refreshSources: () => Promise<void>;
  setSettings: (settings: Settings) => void;
  markArticleRead: (id: string) => void;
  onCite: (ref: CitationRef) => void;
}

export function useNews(): NewsContext {
  return useOutletContext<NewsContext>();
}
