/**
 * bi-raster — 대량 산점도용 밀도 래스터화(Datashader/Power BI 방식의 경량판).
 *
 * 개별 포인트를 SVG 심볼로 다 그리면(수천~수만) DOM이 폭증해 렉이 난다.
 * 대신 보이는 뷰를 픽셀 그리드로 나눠 포인트를 **집계**하고, 겹침을 밀도로
 * 렌더한다. 줌(뷰 축소)하면 같은 픽셀 그리드에 더 넓은 데이터 해상도가 잡혀
 * 개별 포인트가 다시 벌어져 보인다(재비닝 = LOD). 전 포인트를 반영하므로
 * 다운샘플링(행 버림)이 아니다 — 데이터 손실 0.
 *
 * 순수 함수라 엔진/차트와 독립적이고 단위 테스트가 쉽다. WebGL 불가 환경에서도
 * 동작하며, GPU 없이 CPU 선형 패스(수백만 포인트도 수 ms)로 처리한다.
 */

export interface RasterView {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** per-point 색상(0–255). 카테고리 색상 인코딩이 있을 때만 전달 */
export interface RasterColors {
  r: Uint8Array | number[];
  g: Uint8Array | number[];
  b: Uint8Array | number[];
}

export interface RasterGrid {
  cols: number;
  rows: number;
  /** cols*rows, 셀별 포인트 수 */
  counts: Float32Array;
  maxCount: number;
  /** 뷰 안에 든 포인트 수 */
  total: number;
  /** 색상 인코딩 시 셀별 색 누적합(평균은 렌더 시 count로 나눔) */
  r?: Float32Array;
  g?: Float32Array;
  b?: Float32Array;
}

/**
 * 포인트를 픽셀 그리드(cols×rows = 디바이스 픽셀)로 집계한다.
 * 뷰 밖·비유한 좌표는 스킵한다. y는 화면 좌표(위→아래)로 뒤집는다.
 */
export function binPoints(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  view: RasterView,
  cols: number,
  rows: number,
  colors?: RasterColors,
): RasterGrid {
  const counts = new Float32Array(cols * rows);
  const hasColor = Boolean(colors);
  const r = hasColor ? new Float32Array(cols * rows) : undefined;
  const g = hasColor ? new Float32Array(cols * rows) : undefined;
  const b = hasColor ? new Float32Array(cols * rows) : undefined;
  const xSpan = view.xMax - view.xMin || 1;
  const ySpan = view.yMax - view.yMin || 1;
  const n = Math.min(xs.length, ys.length);
  let maxCount = 0;
  let total = 0;

  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < view.xMin || x > view.xMax || y < view.yMin || y > view.yMax) continue;
    let cx = Math.floor(((x - view.xMin) / xSpan) * cols);
    let cy = Math.floor(((view.yMax - y) / ySpan) * rows);
    if (cx >= cols) cx = cols - 1;
    if (cy >= rows) cy = rows - 1;
    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    const idx = cy * cols + cx;
    const c = counts[idx] + 1;
    counts[idx] = c;
    if (c > maxCount) maxCount = c;
    total++;
    if (hasColor) {
      r![idx] += colors!.r[i];
      g![idx] += colors!.g[i];
      b![idx] += colors!.b[i];
    }
  }
  return { cols, rows, counts, maxCount, total, r, g, b };
}

/**
 * 밀도 그리드 → RGBA 픽셀 버퍼(putImageData 용). 밀도는 로그 스케일 알파로
 * 매핑해 희소 포인트도 보이면서 과밀 영역이 뭉개지지 않게 한다.
 * base는 단색 모드의 [r,g,b](0–255). 색상 인코딩이 있으면 셀 평균색을 쓴다.
 */
export function rasterToRGBA(grid: RasterGrid, base: [number, number, number]): Uint8ClampedArray {
  const { cols, rows, counts, maxCount, r, g, b } = grid;
  const data = new Uint8ClampedArray(cols * rows * 4);
  if (maxCount <= 0) return data;
  const denom = Math.log(1 + maxCount) || 1;
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i];
    if (c <= 0) continue;
    const alpha = 0.2 + 0.8 * (Math.log(1 + c) / denom);
    let R: number;
    let G: number;
    let B: number;
    if (r && g && b) {
      R = r[i] / c;
      G = g[i] / c;
      B = b[i] / c;
    } else {
      R = base[0];
      G = base[1];
      B = base[2];
    }
    const o = i * 4;
    data[o] = R;
    data[o + 1] = G;
    data[o + 2] = B;
    data[o + 3] = Math.round(alpha * 255);
  }
  return data;
}

/** 축 눈금용 nice 스텝(1/2/5 × 10^k). d3 없이 자체 구현. */
export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
    return Number.isFinite(min) ? [min] : [];
  }
  const span = max - min;
  const step0 = Math.pow(10, Math.floor(Math.log10(span / target)));
  const err = span / target / step0;
  const step = err >= 7.5 ? 10 * step0 : err >= 3 ? 5 * step0 : err >= 1.5 ? 2 * step0 : step0;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 1e-6; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/** 데이터 경계 + 여백(fraction)으로 초기 뷰 계산 */
export function boundsToView(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  pad = 0.04,
): RasterView | null {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  const n = Math.min(xs.length, ys.length);
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  if (!Number.isFinite(xMin) || !Number.isFinite(yMin)) return null;
  const xPad = (xMax - xMin) * pad || 0.5;
  const yPad = (yMax - yMin) * pad || 0.5;
  return { xMin: xMin - xPad, xMax: xMax + xPad, yMin: yMin - yPad, yMax: yMax + yPad };
}
