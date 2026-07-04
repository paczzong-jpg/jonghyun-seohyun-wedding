/**
 * bi-causal — 인과 구조 탐색 워크벤치 엔진 (GOAL v2.3)
 *
 * Rath가 문서화한 접근(제약 기반 causal discovery + what-if)을 교과서
 * 알고리즘으로 직접 구현한다 — PC 스켈레톤(Spirtes-Glymour): Fisher-z
 * 조건부 독립 검정으로 엣지 제거(조건집합 차수 0→2) → v-구조 + Meek 규칙로
 * 방향 부여(CPDAG) → 방향 엣지에 선형 SCM을 적합해 do-개입을 전파한다.
 * (AGPL Rath 코드는 열람·복사하지 않음 — GOAL §2 라이선스 원칙)
 *
 * 정직한 한계: 관측 데이터 + 선형·가우시안 가정. UI는 항상
 * "인과 방향을 보장하지 않는 탐색적 분석"임을 표기한다.
 */

import type { DataTable, FieldMeta } from "./bi-types";

export interface CausalEdge {
  /** fields 배열 인덱스 */
  a: number;
  b: number;
  /** true면 a→b 방향 확정(v-구조/Meek), false면 무방향 */
  directed: boolean;
  /** 표시 가중치: 주변 상관계수 (부호 포함) */
  corr: number;
  /** 부트스트랩 재표집에서 이 엣지(무방향 기준)가 나타난 비율 0..1 */
  stability?: number;
  /** 배경지식으로 강제된 엣지면 표시 */
  forced?: boolean;
}

export interface CausalAnalysis {
  fields: FieldMeta[];
  /** 결측 제거 후 사용된 행 수 */
  n: number;
  edges: CausalEdge[];
  /** beta[child][parent] — 방향 엣지 기준 표준화 회귀계수 (SCM) */
  beta: number[][];
  /** child별 결정계수 (부모 회귀) */
  r2: number[];
  /** 방향 부모가 없는 노드용 — 인접 이웃 연관 회귀 계수/결정계수 (전파 없음) */
  assocBeta: number[][];
  assocR2: number[];
  /** 방향 그래프의 위상 순서 (무방향 엣지는 전파에서 제외) */
  topo: number[];
}

// ---------------------------------------------------------------------------
// 행렬 유틸 (소규모 전용)
// ---------------------------------------------------------------------------

/** 가우스-조던 역행렬. 특이 시 릿지(λI) 재시도 */
function invert(mat: number[][]): number[][] {
  const k = mat.length;
  const a = mat.map((row, i) => [...row, ...row.map((_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < k; col++) {
    let pivot = col;
    for (let r = col + 1; r < k; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < 1e-10) {
      // 릿지 보정 후 재귀 1회
      const ridged = mat.map((row, i) => row.map((v, j) => (i === j ? v + 1e-6 : v)));
      return invert(ridged);
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const div = a[col][col];
    for (let j = 0; j < 2 * k; j++) a[col][j] /= div;
    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const factor = a[r][col];
      for (let j = 0; j < 2 * k; j++) a[r][j] -= factor * a[col][j];
    }
  }
  return a.map((row) => row.slice(k));
}

// ---------------------------------------------------------------------------
// 데이터 준비 — 표준화 행렬 + 상관행렬
// ---------------------------------------------------------------------------

function buildStandardized(
  table: DataTable,
  fids: string[],
  sample = 4000,
): { cols: number[][]; n: number } | null {
  const raw = fids.map((fid) => table.columns[fid] ?? []);
  const indices: number[] = [];
  const step = Math.max(1, Math.floor(table.rowCount / sample));
  for (let i = 0; i < table.rowCount; i += step) {
    if (raw.every((col) => typeof col[i] === "number" && Number.isFinite(col[i] as number))) {
      indices.push(i);
    }
  }
  const n = indices.length;
  if (n < 30) return null;
  const cols = raw.map((col) => {
    const v = indices.map((i) => col[i] as number);
    const mean = v.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(v.reduce((x, y) => x + (y - mean) ** 2, 0) / (n - 1)) || 1;
    return v.map((x) => (x - mean) / sd);
  });
  return { cols, n };
}

function corrMatrix(cols: number[][], n: number): number[][] {
  const k = cols.length;
  const r: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    r[i][i] = 1;
    for (let j = i + 1; j < k; j++) {
      let s = 0;
      for (let t = 0; t < n; t++) s += cols[i][t] * cols[j][t];
      r[i][j] = r[j][i] = s / (n - 1);
    }
  }
  return r;
}

/** 조건집합 S가 주어진 부분상관 — {i,j}∪S 부분행렬의 정밀행렬로 계산 */
function partialCorr(r: number[][], i: number, j: number, S: number[]): number {
  const idx = [i, j, ...S];
  const sub = idx.map((a) => idx.map((b) => r[a][b]));
  const p = invert(sub);
  const denom = Math.sqrt(p[0][0] * p[1][1]);
  if (!Number.isFinite(denom) || denom === 0) return 0;
  return -p[0][1] / denom;
}

/** Fisher-z 독립 판정: |z|·√(n-|S|-3) < 임계 → 조건부 독립 */
function isIndependent(rho: number, n: number, condSize: number, alpha: number): boolean {
  const clamped = Math.max(-0.99999, Math.min(0.99999, rho));
  const z = 0.5 * Math.log((1 + clamped) / (1 - clamped));
  const stat = Math.abs(z) * Math.sqrt(Math.max(1, n - condSize - 3));
  const critical = alpha <= 0.01 ? 2.576 : 1.96;
  return stat < critical;
}

function* subsets(arr: number[], size: number): Generator<number[]> {
  if (size === 0) {
    yield [];
    return;
  }
  for (let i = 0; i <= arr.length - size; i++) {
    for (const rest of subsets(arr.slice(i + 1), size - 1)) {
      yield [arr[i], ...rest];
    }
  }
}

// ---------------------------------------------------------------------------
// PC 알고리즘
// ---------------------------------------------------------------------------

export interface CausalOptions {
  alpha?: 0.05 | 0.01;
  maxCond?: number;
  sample?: number;
  /** 배경지식: 연결 금지 쌍(무방향 인덱스). 스켈레톤에서 항상 제거 */
  forbidden?: [number, number][];
  /** 배경지식: 강제 방향 엣지 a→b. CI 검정과 무관하게 유지·정향 */
  required?: [number, number][];
  /** 부트스트랩 재표집 횟수(엣지 안정성). 0이면 미실행 */
  bootstrap?: number;
  /** 재표집 RNG(테스트 결정성용). 기본 Math.random */
  rng?: () => number;
}

/** PC 구조 탐색 1회: 스켈레톤 → v-구조 → Meek → 배경지식. adj/dir 반환 */
function discoverStructure(
  r: number[][],
  n: number,
  k: number,
  alpha: number,
  maxCond: number,
  forbidden: [number, number][],
  required: [number, number][],
): { adj: boolean[][]; dir: boolean[][] } {
  const forbid = new Set(forbidden.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
  const req = new Set(required.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
  const adj: boolean[][] = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => i !== j && !forbid.has(`${Math.min(i, j)}-${Math.max(i, j)}`)),
  );
  const sepset = new Map<string, number[]>();
  for (let cond = 0; cond <= maxCond; cond++) {
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        if (!adj[i][j] || req.has(`${i}-${j}`)) continue; // 강제 엣지는 제거 금지
        const neighbors: number[] = [];
        for (let t = 0; t < k; t++) if (t !== i && t !== j && adj[i][t]) neighbors.push(t);
        if (neighbors.length < cond) continue;
        for (const S of subsets(neighbors, cond)) {
          const rho = cond === 0 ? r[i][j] : partialCorr(r, i, j, S);
          if (isIndependent(rho, n, cond, alpha)) {
            adj[i][j] = adj[j][i] = false;
            sepset.set(`${i}-${j}`, S);
            break;
          }
        }
      }
    }
  }

  const dir: boolean[][] = Array.from({ length: k }, () => new Array(k).fill(false));
  // 배경지식 강제 방향을 먼저 심어 Meek 전파의 씨앗으로 삼는다
  for (const [a, b] of required) {
    if (a < k && b < k) { adj[a][b] = adj[b][a] = true; dir[a][b] = true; }
  }
  // v-구조: i-k-j (i,j 비인접) & k ∉ sepset(i,j) → i→k←j
  for (let ki = 0; ki < k; ki++) {
    for (let i = 0; i < k; i++) {
      if (i === ki || !adj[i][ki]) continue;
      for (let j = i + 1; j < k; j++) {
        if (j === ki || !adj[j][ki] || adj[i][j]) continue;
        const S = sepset.get(`${Math.min(i, j)}-${Math.max(i, j)}`) ?? [];
        if (!S.includes(ki)) { dir[i][ki] = true; dir[j][ki] = true; }
      }
    }
  }
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) if (dir[i][j] && dir[j][i]) dir[i][j] = dir[j][i] = false;
  }
  // Meek 규칙 1·2 반복
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        if (!adj[i][j] || dir[i][j] || dir[j][i]) continue;
        for (let t = 0; t < k; t++) {
          if (dir[t][i] && !adj[t][j] && t !== j) { dir[i][j] = true; changed = true; break; }
        }
        if (dir[i][j]) continue;
        for (let t = 0; t < k; t++) {
          if (dir[i][t] && dir[t][j]) { dir[i][j] = true; changed = true; break; }
        }
      }
    }
  }
  // 배경지식 강제 방향을 최종 재확정(충돌 시 배경지식 우선)
  for (const [a, b] of required) {
    if (a < k && b < k) { dir[a][b] = true; dir[b][a] = false; }
  }
  return { adj, dir };
}

/** 표준화 컬럼을 행 복원추출로 재표집해 상관행렬 반환 */
function resampledCorr(cols: number[][], n: number, rng: () => number): number[][] {
  const idx: number[] = new Array(n);
  for (let i = 0; i < n; i++) idx[i] = Math.min(n - 1, Math.floor(rng() * n));
  const rs = cols.map((c) => idx.map((ix) => c[ix]));
  return corrMatrix(rs, n);
}

export function analyzeCausal(
  table: DataTable,
  fids: string[],
  opts: CausalOptions = {},
): CausalAnalysis | null {
  const alpha = opts.alpha ?? 0.05;
  const maxCond = opts.maxCond ?? 2;
  const fields = fids
    .map((fid) => table.fields.find((f) => f.fid === fid))
    .filter((f): f is FieldMeta => Boolean(f));
  if (fields.length < 2) return null;

  const std = buildStandardized(table, fields.map((f) => f.fid), opts.sample);
  if (!std) return null;
  const { cols, n } = std;
  const k = fields.length;
  const r = corrMatrix(cols, n);

  // 1~3) 스켈레톤 → v-구조 → Meek + 배경지식(금지/강제 엣지)
  const forbidden = (opts.forbidden ?? []).filter(([a, b]) => a < k && b < k && a >= 0 && b >= 0);
  const required = (opts.required ?? []).filter(([a, b]) => a < k && b < k && a >= 0 && b >= 0);
  const reqSet = new Set(required.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`));
  const { adj, dir } = discoverStructure(r, n, k, alpha, maxCond, forbidden, required);

  // 4) 엣지 목록 (배경지식 강제 엣지는 forced 표시)
  const forcedOf = (i: number, j: number) => reqSet.has(`${Math.min(i, j)}-${Math.max(i, j)}`);
  const edges: CausalEdge[] = [];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      if (!adj[i][j]) continue;
      const forced = forcedOf(i, j);
      if (dir[i][j]) edges.push({ a: i, b: j, directed: true, corr: r[i][j], forced });
      else if (dir[j][i]) edges.push({ a: j, b: i, directed: true, corr: r[i][j], forced });
      else edges.push({ a: i, b: j, directed: false, corr: r[i][j], forced });
    }
  }

  // 4b) 부트스트랩 엣지 안정성: 행 복원추출로 B회 재탐색해 무방향 출현 비율
  const B = Math.max(0, Math.floor(opts.bootstrap ?? 0));
  if (B > 0) {
    const rng = opts.rng ?? Math.random;
    const count: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let b = 0; b < B; b++) {
      const rb = resampledCorr(cols, n, rng);
      const s = discoverStructure(rb, n, k, alpha, maxCond, forbidden, required);
      for (let i = 0; i < k; i++)
        for (let j = i + 1; j < k; j++) if (s.adj[i][j]) count[i][j]++;
    }
    for (const e of edges) {
      const i = Math.min(e.a, e.b);
      const j = Math.max(e.a, e.b);
      e.stability = count[i][j] / B;
    }
  }

  // 5) 선형 SCM: 방향 엣지의 부모로 각 노드를 OLS 적합 (표준화 계수)
  const beta: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const r2: number[] = new Array(k).fill(0);
  for (let child = 0; child < k; child++) {
    const parents: number[] = [];
    for (let p = 0; p < k; p++) if (dir[p][child]) parents.push(p);
    if (parents.length === 0) continue;
    // 정규방정식: B = Rpp⁻¹ · Rpc (표준화라 상관행렬로 충분)
    const rpp = parents.map((a) => parents.map((b) => r[a][b]));
    const rpc = parents.map((a) => [r[a][child]]);
    const inv = invert(rpp);
    const betas = inv.map((row) => row.reduce((s, v, idx) => s + v * rpc[idx][0], 0));
    parents.forEach((p, idx) => {
      beta[child][p] = betas[idx];
    });
    r2[child] = Math.max(
      0,
      Math.min(1, parents.reduce((s, p, idx) => s + betas[idx] * r[p][child], 0)),
    );
  }

  // 5b) 연관 회귀 폴백: 방향 부모가 없는 노드는 인접 이웃으로 적합
  const assocBeta: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const assocR2: number[] = new Array(k).fill(0);
  for (let child = 0; child < k; child++) {
    const neighbors: number[] = [];
    for (let t = 0; t < k; t++) if (t !== child && adj[child][t]) neighbors.push(t);
    if (neighbors.length === 0) continue;
    const rpp = neighbors.map((a) => neighbors.map((b) => r[a][b]));
    const rpc = neighbors.map((a) => [r[a][child]]);
    const inv2 = invert(rpp);
    const betas2 = inv2.map((row) => row.reduce((s, v, idx) => s + v * rpc[idx][0], 0));
    neighbors.forEach((t, idx) => {
      assocBeta[child][t] = betas2[idx];
    });
    assocR2[child] = Math.max(
      0,
      Math.min(1, neighbors.reduce((s, t, idx) => s + betas2[idx] * r[t][child], 0)),
    );
  }

  // 6) 위상 순서 (방향 엣지만, Kahn)
  const indeg = new Array(k).fill(0);
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) if (dir[i][j]) indeg[j]++;
  const queue: number[] = [];
  for (let i = 0; i < k; i++) if (indeg[i] === 0) queue.push(i);
  const topo: number[] = [];
  while (queue.length) {
    const node = queue.shift()!;
    topo.push(node);
    for (let j = 0; j < k; j++) {
      if (dir[node][j] && --indeg[j] === 0) queue.push(j);
    }
  }
  for (let i = 0; i < k; i++) if (!topo.includes(i)) topo.push(i); // 안전망

  return { fields, n, edges, beta, r2, assocBeta, assocR2, topo };
}

/**
 * do-개입 전파: 개입 변수를 σ 단위로 고정하고 SCM을 위상 순서로 전개.
 * 반환은 각 노드의 예상 변화(σ 단위).
 */
export function predictIntervention(
  analysis: CausalAnalysis,
  interventionsSigma: Record<number, number>,
): number[] {
  const k = analysis.fields.length;
  const delta = new Array(k).fill(0);
  const fixed = new Set<number>();
  for (const [idx, v] of Object.entries(interventionsSigma)) {
    delta[Number(idx)] = v;
    fixed.add(Number(idx));
  }
  for (const node of analysis.topo) {
    if (fixed.has(node)) continue;
    let sum = 0;
    for (let p = 0; p < k; p++) {
      if (analysis.beta[node][p] !== 0) sum += analysis.beta[node][p] * delta[p];
    }
    if (sum !== 0) delta[node] = sum;
  }
  return delta;
}

/** 인과 그래프 후보 필드: quantitative measure + 저카디널리티 정수 제외한 수치형 */
export function causalCandidateFields(table: DataTable): FieldMeta[] {
  return table.fields.filter(
    (f) =>
      !f.hidden &&
      (f.dataType === "int" || f.dataType === "float") &&
      f.semanticType !== "temporal" &&
      (f.profile.stdev ?? 0) > 0,
  );
}
