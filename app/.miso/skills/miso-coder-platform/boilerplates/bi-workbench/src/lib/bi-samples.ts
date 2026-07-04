/**
 * bi-samples — 시드 고정 샘플 데이터셋 3종 (GOAL_UIUX §2.2 온보딩)
 * 같은 시드 = 같은 데이터. 외부 다운로드 없이 온보딩이 즉시 동작한다.
 */

import type { ParsedGrid } from "./bi-profile";

/** mulberry32 — 시드 고정 PRNG */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, items: T[], weights?: number[]): T {
  if (!weights) return items[Math.floor(rand() * items.length)];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export interface SampleDataset {
  key: string;
  name: string;
  emoji: string;
  description: string;
  build: () => ParsedGrid;
}

function buildEcommerce(): ParsedGrid {
  const rand = prng(20260702);
  const regions = ["서울", "경기", "부산", "대구", "해외"];
  const regionW = [34, 28, 14, 9, 15];
  const categories = ["전자기기", "패션", "홈리빙", "뷰티", "식품", "스포츠"];
  const catBase: Record<string, number> = {
    전자기기: 180_000, 패션: 62_000, 홈리빙: 45_000, 뷰티: 32_000, 식품: 21_000, 스포츠: 54_000,
  };
  const channels = ["웹", "모바일 앱", "제휴몰"];
  const channelW = [38, 47, 15];

  const headers = [
    "order_date", "region", "category", "channel",
    "quantity", "unit_price", "revenue", "cost", "customer_age", "is_repeat",
  ];
  const rows: unknown[][] = [];
  const start = Date.UTC(2024, 6, 1);
  const end = Date.UTC(2026, 5, 30);
  const span = end - start;
  const count = 18_000;

  for (let i = 0; i < count; i++) {
    // 시간 경과에 따른 완만한 성장 + 11월(프로모션) 스파이크
    let t = start + rand() ** 0.8 * span;
    const d = new Date(t);
    if (d.getUTCMonth() === 10 && rand() < 0.35) t -= 0; // 11월 가중치는 아래 중복 생성으로
    const month = new Date(t).getUTCMonth();
    const category = pick(rand, categories);
    const channel = pick(rand, channels, channelW);
    const region = pick(rand, regions, regionW);
    const quantity = 1 + Math.floor(rand() * 4);
    const base = catBase[category];
    const unitPrice = Math.round(base * (0.6 + rand() * 0.9));
    const promo = month === 10 ? 0.85 : 1;
    const revenue = Math.round(unitPrice * quantity * promo);
    const margin = category === "전자기기" ? 0.12 + rand() * 0.08 : 0.25 + rand() * 0.2;
    const cost = Math.round(revenue * (1 - margin));
    const age = Math.max(18, Math.min(75, Math.round(38 + (rand() + rand() - 1) * 18)));
    rows.push([
      new Date(t).toISOString().slice(0, 10),
      region, category, channel,
      quantity, unitPrice, revenue, cost, age,
      rand() < 0.42 ? "재구매" : "신규",
    ]);
    // 11월 주문 볼륨 스파이크
    if (month === 10 && rand() < 0.5) {
      const extraRev = Math.round(unitPrice * promo);
      rows.push([
        new Date(t + 86_400_000).toISOString().slice(0, 10),
        region, category, "모바일 앱", 1, unitPrice, extraRev,
        Math.round(extraRev * (1 - margin)), age, "신규",
      ]);
    }
  }
  return { headers, rows };
}

function buildStocks(): ParsedGrid {
  const rand = prng(42);
  const tickers = [
    { name: "ALPHA", price: 68_000, drift: 0.0009, vol: 0.021 },
    { name: "BRAVO", price: 142_000, drift: 0.0002, vol: 0.013 },
    { name: "CHARLIE", price: 23_500, drift: -0.0004, vol: 0.032 },
  ];
  const headers = ["date", "ticker", "close", "volume", "change_rate"];
  const rows: unknown[][] = [];
  const start = Date.UTC(2024, 0, 2);
  for (const t of tickers) {
    let price = t.price;
    for (let day = 0; day < 780; day++) {
      const date = new Date(start + day * 86_400_000);
      const dow = date.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      const change = t.drift + (rand() + rand() + rand() - 1.5) * t.vol;
      const prev = price;
      price = Math.max(1000, price * (1 + change));
      rows.push([
        date.toISOString().slice(0, 10),
        t.name,
        Math.round(price),
        Math.round(50_000 + rand() * 900_000 * (1 + Math.abs(change) * 30)),
        Math.round(((price - prev) / prev) * 10_000) / 100,
      ]);
    }
  }
  return { headers, rows };
}

function buildPopulation(): ParsedGrid {
  const rand = prng(7);
  const districts = [
    "강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구",
    "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구",
    "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구",
  ];
  const ageGroups = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80+"];
  const ageShape = [5.5, 7, 14, 16, 15.5, 15, 13, 9, 5];
  const headers = ["district", "age_group", "gender", "population", "households"];
  const rows: unknown[][] = [];
  for (const district of districts) {
    const size = 120_000 + rand() * 380_000;
    for (let a = 0; a < ageGroups.length; a++) {
      for (const gender of ["남", "여"]) {
        const base = (size * ageShape[a]) / 100 / 2;
        const populationCount = Math.round(base * (0.85 + rand() * 0.3));
        rows.push([
          district, ageGroups[a], gender,
          populationCount,
          Math.round(populationCount / (1.6 + rand() * 0.9)),
        ]);
      }
    }
  }
  return { headers, rows };
}

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    key: "ecommerce",
    name: "이커머스 주문",
    emoji: "🛒",
    description: "2년치 주문 2만여 건 — 지역·카테고리·채널·매출",
    build: buildEcommerce,
  },
  {
    key: "stocks",
    name: "주가 시계열",
    emoji: "📈",
    description: "가상 종목 3개 × 2년 일봉 — 종가·거래량·등락률",
    build: buildStocks,
  },
  {
    key: "population",
    name: "서울 인구 통계",
    emoji: "🏙",
    description: "자치구 × 연령대 × 성별 인구·가구 스냅샷",
    build: buildPopulation,
  },
];
