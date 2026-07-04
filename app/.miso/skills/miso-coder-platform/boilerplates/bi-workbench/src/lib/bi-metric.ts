/**
 * bi-metric — 저장된 지표(집계 표현식). Superset 시맨틱 레이어의 metric에 해당.
 *
 * 행 단위 계산 필드(bi-formula)로는 표현할 수 없는 "집계 후 산술"을 담는다.
 *   예) 객단가 = sum([revenue]) / count()
 *       고객당매출 = sum([revenue]) / countDistinct([customer_id])
 *       이익률 = sum([revenue] 대비 sum([cost])) → sum([margin])/sum([revenue])
 *
 * 컴파일 결과는 (1) 필요한 기저 집계 목록과 (2) 그 값으로 지표를 구하는 순수
 * 평가 함수다. 엔진은 그룹별 기저 집계를 계산한 뒤 평가 함수를 적용한다.
 * 자족적(bi-types만 의존)이라 엔진/유도와 순환 참조가 없다.
 */

import type { AggFn } from "./bi-types";

const AGG_FNS = new Set<AggFn>([
  "sum",
  "mean",
  "median",
  "count",
  "countDistinct",
  "min",
  "max",
  "stdev",
  "variance",
]);

export class MetricError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetricError";
  }
}

/** 기저 집계 하나 — 엔진이 그룹별로 계산해 alias 키에 담는다 */
export interface MetricBaseAgg {
  alias: string;
  fid: string;
  agg: AggFn;
}

export interface CompiledMetric {
  baseAggs: MetricBaseAgg[];
  /** 기저 집계 값 맵(alias→number)으로 지표를 계산 (0 나눗셈·비수치는 null) */
  evaluate: (aggValues: Record<string, number | null>) => number | null;
}

// ---------------------------------------------------------------------------
// 토크나이저
// ---------------------------------------------------------------------------

type Tok =
  | { t: "num"; v: number }
  | { t: "op"; v: "+" | "-" | "*" | "/" }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "ident"; v: string }
  | { t: "field"; v: string };

function tokenize(expr: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = expr.length;
  while (i < n) {
    const c = expr[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c === "(") {
      toks.push({ t: "lp" });
      i++;
      continue;
    }
    if (c === ")") {
      toks.push({ t: "rp" });
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "[") {
      const end = expr.indexOf("]", i);
      if (end < 0) throw new MetricError("필드 참조 대괄호가 닫히지 않았습니다");
      toks.push({ t: "field", v: expr.slice(i + 1, end).trim() });
      i = end + 1;
      continue;
    }
    if (c >= "0" && c <= "9") {
      let j = i + 1;
      while (j < n && ((expr[j] >= "0" && expr[j] <= "9") || expr[j] === ".")) j++;
      toks.push({ t: "num", v: Number(expr.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_]/.test(expr[j])) j++;
      toks.push({ t: "ident", v: expr.slice(i, j) });
      i = j;
      continue;
    }
    throw new MetricError(`알 수 없는 문자: ${c}`);
  }
  return toks;
}

// ---------------------------------------------------------------------------
// 파서 (재귀 하강) — 단자는 숫자 / 괄호 / 집계호출
// ---------------------------------------------------------------------------

type Node =
  | { k: "num"; v: number }
  | { k: "agg"; alias: string }
  | { k: "bin"; op: "+" | "-" | "*" | "/"; a: Node; b: Node }
  | { k: "neg"; a: Node };

/** field 표시명/이름 → fid 해석 (없으면 null) */
export type FieldResolver = (ref: string) => string | null;

export function compileMetric(expr: string, resolve: FieldResolver): CompiledMetric {
  const trimmed = expr.trim();
  if (!trimmed) throw new MetricError("빈 수식입니다");
  const toks = tokenize(trimmed);
  let pos = 0;
  const baseAggs: MetricBaseAgg[] = [];
  const aggKey = new Map<string, string>(); // "agg:fid" → alias (중복 제거)

  const peek = () => toks[pos];
  const next = () => toks[pos++];

  const registerAgg = (agg: AggFn, fid: string): string => {
    const key = `${agg}:${fid}`;
    const existing = aggKey.get(key);
    if (existing) return existing;
    const alias = `m${baseAggs.length}`;
    aggKey.set(key, alias);
    baseAggs.push({ alias, fid, agg });
    return alias;
  };

  function parsePrimary(): Node {
    const tk = peek();
    if (!tk) throw new MetricError("수식이 갑자기 끝났습니다");
    if (tk.t === "num") {
      next();
      return { k: "num", v: tk.v };
    }
    if (tk.t === "lp") {
      next();
      const inner = parseAdd();
      if (peek()?.t !== "rp") throw new MetricError("괄호가 닫히지 않았습니다");
      next();
      return inner;
    }
    if (tk.t === "op" && tk.v === "-") {
      next();
      return { k: "neg", a: parseUnary() };
    }
    if (tk.t === "ident") {
      const name = tk.v as AggFn;
      if (!AGG_FNS.has(name)) throw new MetricError(`알 수 없는 집계 함수: ${tk.v}`);
      next();
      if (peek()?.t !== "lp") throw new MetricError(`${tk.v} 뒤에 (가 필요합니다`);
      next();
      let fid: string;
      if (name === "count") {
        // count() 또는 count(*) — 행 수. 임의 필드 없이 특수 처리
        if (peek()?.t !== "rp") {
          // count([field]) 도 허용하되 결측 무시 카운트로 처리
          const arg = peek();
          if (arg?.t === "field") {
            next();
            const f = resolve(arg.v);
            if (!f) throw new MetricError(`필드를 찾을 수 없습니다: ${arg.v}`);
            fid = f;
          } else {
            throw new MetricError("count()의 인자는 [필드]여야 합니다");
          }
        } else {
          fid = "*";
        }
      } else {
        const arg = peek();
        if (arg?.t !== "field") throw new MetricError(`${tk.v}()의 인자는 [필드] 하나여야 합니다`);
        next();
        const f = resolve(arg.v);
        if (!f) throw new MetricError(`필드를 찾을 수 없습니다: ${arg.v}`);
        fid = f;
      }
      if (peek()?.t !== "rp") throw new MetricError(`${tk.v}( 가 닫히지 않았습니다`);
      next();
      const alias = registerAgg(name, fid);
      return { k: "agg", alias };
    }
    throw new MetricError("숫자·괄호·집계 함수가 필요합니다");
  }

  function parseUnary(): Node {
    if (peek()?.t === "op" && (peek() as { v: string }).v === "-") {
      next();
      return { k: "neg", a: parseUnary() };
    }
    return parsePrimary();
  }

  function parseMul(): Node {
    let node = parseUnary();
    while (peek()?.t === "op" && ((peek() as { v: string }).v === "*" || (peek() as { v: string }).v === "/")) {
      const op = (next() as { v: "*" | "/" }).v;
      node = { k: "bin", op, a: node, b: parseUnary() };
    }
    return node;
  }

  function parseAdd(): Node {
    let node = parseMul();
    while (peek()?.t === "op" && ((peek() as { v: string }).v === "+" || (peek() as { v: string }).v === "-")) {
      const op = (next() as { v: "+" | "-" }).v;
      node = { k: "bin", op, a: node, b: parseMul() };
    }
    return node;
  }

  const ast = parseAdd();
  if (pos < toks.length) throw new MetricError("수식을 끝까지 해석하지 못했습니다");

  const evalNode = (node: Node, vals: Record<string, number | null>): number | null => {
    switch (node.k) {
      case "num":
        return node.v;
      case "agg": {
        const v = vals[node.alias];
        return typeof v === "number" && Number.isFinite(v) ? v : null;
      }
      case "neg": {
        const a = evalNode(node.a, vals);
        return a === null ? null : -a;
      }
      case "bin": {
        const a = evalNode(node.a, vals);
        const b = evalNode(node.b, vals);
        if (a === null || b === null) return null;
        if (node.op === "+") return a + b;
        if (node.op === "-") return a - b;
        if (node.op === "*") return a * b;
        return b === 0 ? null : a / b; // 0 나눗셈 → null
      }
    }
  };

  return { baseAggs, evaluate: (vals) => evalNode(ast, vals) };
}
