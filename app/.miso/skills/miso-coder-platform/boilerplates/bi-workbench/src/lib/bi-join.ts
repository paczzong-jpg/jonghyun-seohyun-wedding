/**
 * bi-join — 멀티테이블 조인(시맨틱 모델).
 *
 * 팩트(왼쪽) 테이블을 디멘션(오른쪽) 테이블들과 비정규화해 단일 DataTable로
 * 만든다. 결과는 평범한 평면 테이블이라 엔진·유도·차트가 그대로 동작한다
 * (엔진 무수정). 룩업 조인 의미론이므로 왼쪽 카디널리티가 보존된다.
 */

import type { DataTable, FieldMeta, JoinRelationship, Scalar } from "./bi-types";
import { profileColumn } from "./bi-profile";

export interface JoinInput {
  /** 오른쪽(디멘션) 베이스 테이블 */
  table: DataTable;
  rel: JoinRelationship;
  /** 표시명 접두 — 오른쪽 데이터셋 이름 */
  label: string;
}

/** 조인키 정규화: 숫자/문자 혼용을 허용하고 null은 매칭 제외 */
function joinKey(v: Scalar): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

/** 오른쪽 조인 필드에 부여할 안정 fid — 관계 id로 네임스페이스 */
export function joinedFid(relId: string, rightFid: string): string {
  return `j${relId}_${rightFid}`;
}

/**
 * 왼쪽 테이블을 오른쪽 입력들과 조인한다.
 * - inner: 매칭 없는 왼쪽 행 제거 / left: 유지(오른쪽 컬럼 null)
 * - 오른쪽 조인키 컬럼은 왼쪽 키와 중복이므로 편입에서 제외
 * - 편입 필드 fid=`j{relId}_{rightFid}`, displayName=`{label}·{name}`
 */
export function joinTables(left: DataTable, rights: JoinInput[]): DataTable {
  if (rights.length === 0) return left;

  const n = left.rowCount;

  // 관계별로 왼쪽 각 행 → 오른쪽 행 인덱스(없으면 -1) 매핑을 미리 계산
  const matchByRel = rights.map(({ table, rel }) => {
    const leftKeyCol = left.columns[rel.leftFid] ?? [];
    const rightKeyCol = table.columns[rel.rightFid] ?? [];
    const lookup = new Map<string, number>();
    for (let r = 0; r < table.rowCount; r++) {
      const k = joinKey(rightKeyCol[r]);
      if (k !== null && !lookup.has(k)) lookup.set(k, r); // 첫 행 우선(룩업)
    }
    const matches = new Int32Array(n);
    for (let i = 0; i < n; i++) {
      const k = joinKey(leftKeyCol[i]);
      matches[i] = k === null ? -1 : (lookup.get(k) ?? -1);
    }
    return matches;
  });

  // inner 조인은 매칭 없는 왼쪽 행을 제거 — keep 마스크 계산
  const keep: number[] = [];
  for (let i = 0; i < n; i++) {
    let ok = true;
    for (let j = 0; j < rights.length; j++) {
      if (rights[j].rel.kind === "inner" && matchByRel[j][i] < 0) {
        ok = false;
        break;
      }
    }
    if (ok) keep.push(i);
  }

  const fields: FieldMeta[] = [];
  const columns: Record<string, Scalar[]> = {};

  // 왼쪽 필드: keep 마스크로 필터
  for (const f of left.fields) {
    const src = left.columns[f.fid] ?? [];
    columns[f.fid] = keep.map((i) => src[i] ?? null);
    fields.push(f);
  }

  // 오른쪽 필드: 조인키 제외하고 네임스페이스로 편입
  for (let j = 0; j < rights.length; j++) {
    const { table, rel, label } = rights[j];
    const matches = matchByRel[j];
    for (const rf of table.fields) {
      if (rf.fid === rel.rightFid) continue; // 조인키 중복 제외
      if (rf.derived) continue; // 오른쪽 파생 필드는 편입하지 않음(베이스 컬럼만)
      const src = table.columns[rf.fid] ?? [];
      const values: Scalar[] = keep.map((i) => {
        const m = matches[i];
        return m >= 0 ? (src[m] ?? null) : null;
      });
      const fid = joinedFid(rel.id, rf.fid);
      columns[fid] = values;
      fields.push({
        ...rf,
        fid,
        displayName: `${label}·${rf.displayName}`,
        joinLabel: label,
        // 조인 후 분포가 달라지므로 프로파일 재계산
        profile: profileColumn(values, rf),
      });
    }
  }

  return { datasetId: left.datasetId, fields, columns, rowCount: keep.length };
}
