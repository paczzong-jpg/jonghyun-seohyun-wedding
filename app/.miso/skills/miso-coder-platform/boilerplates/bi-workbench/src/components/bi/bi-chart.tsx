/**
 * BiChart — ChartSpec 하나로 모든 시각화를 렌더한다 (GOAL §7.4의 <BiChart>).
 * spec → (derive) → QueryResult → recharts/커스텀 surface.
 * 탐색 캔버스·대시보드 위젯·추천 미니차트가 전부 이 컴포넌트를 쓴다.
 */

import { memo, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AlertCircle, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ChartSpec,
  DataTable,
  FilterRule,
  Scalar,
} from "@/lib/bi-types";
import { useChartComputation, type ChartComputation } from "@/lib/bi-hooks";
import { defaultAgg, encodingLabel, fieldOf } from "@/lib/bi-derive";
import { distinctValues } from "@/lib/bi-engine";
import { formatAxisValue, formatCell, formatNumber } from "@/lib/bi-format";
import type { SelectionPart } from "@/lib/bi-explain";
import { CenteredNote, HeatmapSurface, BoxplotSurface, pivotSeries, buildScatterSeries, MAX_SERIES, type SeriesData } from "./chart-surfaces";
import { augmentTimeSeries } from "@/lib/bi-timeseries";
import { RasterScatter } from "./scatter-raster-surface";

export interface DatumClickPayload {
  /** 클릭 지점의 dimension 값들 (필터·드릴다운·Explainer 재료) */
  parts: SelectionPart[];
}

export interface BiChartProps {
  table: DataTable;
  spec: ChartSpec;
  extraFilters?: FilterRule[];
  className?: string;
  /** 이미 계산된 결과 재사용 (Explorer가 상태바 공유 시) */
  computation?: ChartComputation;
  onDatumClick?: (payload: DatumClickPayload) => void;
  /** 축·범례 등 크롬 최소화 (미니차트) */
  compact?: boolean;
}

interface XInfo {
  key: string;
  formatter: (v: Scalar) => string;
}

function useXInfo(table: DataTable, spec: ChartSpec, xKey: string | undefined): XInfo {
  return useMemo(() => {
    const enc = spec.encodings.x;
    if (!xKey || !enc) return { key: xKey ?? "", formatter: (v) => String(v ?? "") };
    const field = fieldOf(table.fields, enc.fid);
    if (enc.bucket && "unit" in enc.bucket) {
      const unit = enc.bucket.unit;
      return { key: xKey, formatter: (v) => formatAxisValue(v, { unit }) };
    }
    if (enc.bucket && "binCount" in enc.bucket) {
      const p = field?.profile;
      const width =
        p && typeof p.max === "number" && typeof p.min === "number"
          ? (p.max - p.min) / enc.bucket.binCount
          : undefined;
      return { key: xKey, formatter: (v) => formatAxisValue(v, { binWidth: width }) };
    }
    if (field?.semanticType === "temporal") {
      return { key: xKey, formatter: (v) => formatAxisValue(v, { isTemporal: true }) };
    }
    return { key: xKey, formatter: (v) => formatCell(v, field) };
  }, [table, spec, xKey]);
}


export const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

/** 이 이상이면 개별 SVG 심볼 대신 밀도 래스터로 렌더 */
const SCATTER_RASTER_MIN = 2000;

function ChartTooltipContent({
  active,
  payload,
  label,
  xFormatter,
  valueFormatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: unknown; color?: string }[];
  label?: Scalar;
  xFormatter: (v: Scalar) => string;
  valueFormatter: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <div className="mb-1 font-medium text-foreground">{xFormatter(label)}</div>
      )}
      <div className="space-y-0.5">
        {payload.slice(0, 10).map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="size-2 rounded-[3px]" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto pl-3 font-mono font-medium text-foreground">
              {typeof p.value === "number" ? valueFormatter(p.value) : String(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Facet (소형 다중, Graphic Walker row/column 트렐리스)
// ---------------------------------------------------------------------------

const MAX_FACET = 8;

/** row/column 인코딩이 있으면 셀별 하위 차트 그리드로 렌더 */
function BiChartImpl(props: BiChartProps) {
  const { table, spec, extraFilters, className } = props;
  const rowEnc = spec.encodings.row;
  const colEnc = spec.encodings.column;

  const facets = useMemo(() => {
    if (!rowEnc && !colEnc) return null;
    const vals = (enc?: typeof rowEnc) =>
      enc ? distinctValues(table, enc.fid).slice(0, MAX_FACET) : [undefined];
    return { rows: vals(rowEnc), cols: vals(colEnc), rowEnc, colEnc };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, rowEnc?.fid, colEnc?.fid]);

  if (!facets) return <BiChartInner {...props} />;

  const cellSpec: ChartSpec = {
    ...spec,
    encodings: { ...spec.encodings, row: undefined, column: undefined },
  };
  const rowField = facets.rowEnc ? fieldOf(table.fields, facets.rowEnc.fid) : undefined;
  const colField = facets.colEnc ? fieldOf(table.fields, facets.colEnc.fid) : undefined;

  return (
    <div className={cn("flex h-full flex-col overflow-auto", className)}>
      {colField && (
        <div
          className="grid shrink-0 border-b border-border"
          style={{ gridTemplateColumns: `${rowField ? "76px " : ""}repeat(${facets.cols.length}, minmax(120px, 1fr))` }}
        >
          {rowField && <div />}
          {facets.cols.map((cv, i) => (
            <div key={i} className="truncate px-2 py-1 text-center text-[11px] font-semibold text-muted-foreground">
              {formatCell(cv ?? null, colField)}
            </div>
          ))}
        </div>
      )}
      <div className="grid flex-1" style={{ gridTemplateRows: `repeat(${facets.rows.length}, minmax(120px, 1fr))` }}>
        {facets.rows.map((rv, ri) => (
          <div
            key={ri}
            className="grid min-h-0 border-b border-border/60 last:border-b-0"
            style={{ gridTemplateColumns: `${rowField ? "76px " : ""}repeat(${facets.cols.length}, minmax(120px, 1fr))` }}
          >
            {rowField && (
              <div className="flex items-center justify-center border-r border-border/60 px-1 text-center text-[11px] font-semibold text-muted-foreground">
                <span className="truncate">{formatCell(rv ?? null, rowField)}</span>
              </div>
            )}
            {facets.cols.map((cv, ci) => {
              const cellFilters: FilterRule[] = [...(extraFilters ?? [])];
              if (facets.rowEnc && rv !== undefined) cellFilters.push({ fid: facets.rowEnc.fid, op: "oneOf", values: [rv] });
              if (facets.colEnc && cv !== undefined) cellFilters.push({ fid: facets.colEnc.fid, op: "oneOf", values: [cv] });
              return (
                <div key={ci} className="min-h-0 min-w-0 border-r border-border/40 p-1 last:border-r-0">
                  <BiChartInner {...props} spec={cellSpec} extraFilters={cellFilters} compact className="" />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * memo로 감싸 부모 재렌더 시 spec/table/필터가 그대로면 recharts 재계산을
 * 건너뛴다(대시보드 드래그·탐색 중 무관한 상태 변경 등). 얕은 비교라
 * 부모는 onDatumClick/extraFilters를 안정 참조로 넘기는 것이 좋다.
 */
export const BiChart = memo(BiChartImpl);

// ---------------------------------------------------------------------------
// 메인
// ---------------------------------------------------------------------------

function BiChartInner(props: BiChartProps) {
  const { table, spec, extraFilters, className, onDatumClick, compact } = props;
  const internal = useChartComputation(
    props.computation ? undefined : table,
    props.computation ? undefined : spec,
    extraFilters,
  );
  const { derived, result, error } = props.computation ?? internal;

  const xKey = derived?.keys.x;
  const xInfo = useXInfo(table, spec, xKey);
  const numberFormat = spec.style.numberFormat ?? "auto";
  const valueFormatter = useMemo(
    () => (v: number) =>
      spec.stack === "normalize" ? formatNumber(v, "percent") : formatNumber(v, numberFormat),
    [numberFormat, spec.stack],
  );

  // 측정값 출력 키("sum_f7_revenue") → 사람이 읽는 라벨("합계 · revenue")
  const seriesLabelOf = useMemo(() => {
    const map = new Map<string, string>();
    map.set("count", "행 수");
    map.set("value", "값");
    const encs = [
      ...(spec.encodings.y ?? []),
      ...(spec.encodings.theta ? [spec.encodings.theta] : []),
      ...(spec.encodings.size ? [spec.encodings.size] : []),
    ];
    for (const enc of encs) {
      const f = fieldOf(table.fields, enc.fid);
      const agg = enc.agg ?? defaultAgg(f);
      map.set(`${agg}_${enc.fid}`, encodingLabel(enc, table.fields));
    }
    return (key: string) => {
      const m = key.match(/^(.*) · (이동평균|예측)$/);
      if (m) return `${map.get(m[1]) ?? m[1]} · ${m[2]}`;
      return map.get(key) ?? key;
    };
  }, [spec, table]);

  const pivoted = useMemo<SeriesData>(() => {
    if (!derived || !result) return { data: [], series: [], droppedSeries: 0 };
    if (!["bar", "line", "area"].includes(derived.mark)) {
      return { data: result.rows, series: derived.keys.measures, droppedSeries: 0 };
    }
    return pivotSeries(
      result.rows,
      derived.keys.x ?? "",
      derived.keys.color,
      derived.keys.measures[0] ?? "value",
      spec.stack === "normalize",
    );
  }, [derived, result, spec.stack]);

  // 시계열 변환(이동평균·예측) — temporal x의 라인/영역에서만
  const xIsTemporal =
    fieldOf(table.fields, spec.encodings.x?.fid ?? "")?.semanticType === "temporal" ||
    Boolean(spec.encodings.x?.bucket && "unit" in (spec.encodings.x.bucket ?? {}));
  const seriesData = useMemo(() => {
    const ts = spec.timeSeries;
    const applies =
      ts && xIsTemporal && derived && (derived.mark === "line" || derived.mark === "area") &&
      ((ts.movingAvg ?? 0) >= 2 || (ts.forecast ?? 0) >= 1);
    if (!applies) return { ...pivoted, dashed: new Set<string>() };
    const aug = augmentTimeSeries(pivoted.data, pivoted.series, derived!.keys.x ?? "", ts!);
    return { ...pivoted, data: aug.data, series: aug.series, dashed: aug.dashed };
  }, [pivoted, spec.timeSeries, xIsTemporal, derived]);

  if (error) {
    return (
      <CenteredNote
        icon={<AlertCircle className="size-5 text-destructive" />}
        title="쿼리를 실행하지 못했습니다"
        hint={error}
      />
    );
  }
  if (!derived || !result) {
    return (
      <CenteredNote
        icon={<MousePointerClick className="size-5 text-muted-foreground/60" />}
        title="필드를 축으로 끌어오면 차트가 그려집니다"
      />
    );
  }
  if (result.rows.length === 0 && derived.mark !== "kpi") {
    return <CenteredNote title="필터 조합에 해당하는 데이터가 없습니다" hint="필터를 완화해 보세요" />;
  }

  /** x 인코딩 값 → SelectionPart. bucket이면 구간 정보 포함 (Explainer 직전 구간 비교 재료) */
  const makeXPart = (value: Scalar | undefined): SelectionPart | null => {
    const xEnc = spec.encodings.x;
    if (!xEnc || value === undefined || value === null) return null;
    const f = fieldOf(table.fields, xEnc.fid);
    const base = {
      fid: xEnc.fid,
      value,
      label: f?.displayName ?? xEnc.fid,
      valueLabel: xInfo.formatter(value),
    };
    if (xEnc.bucket && "unit" in xEnc.bucket) {
      return { ...base, bucket: { unit: xEnc.bucket.unit } };
    }
    if (xEnc.bucket && "binCount" in xEnc.bucket) {
      const p = f?.profile;
      const width =
        p && typeof p.max === "number" && typeof p.min === "number"
          ? (p.max - p.min) / xEnc.bucket.binCount
          : 1;
      return { ...base, bucket: { binCount: xEnc.bucket.binCount, width } };
    }
    return base;
  };

  const clickHandler = (payloadRow: Record<string, Scalar> | undefined, seriesName?: string) => {
    if (!onDatumClick || !payloadRow) return;
    const parts: DatumClickPayload["parts"] = [];
    const xPart = xKey !== undefined ? makeXPart(payloadRow[xKey]) : null;
    if (xPart) parts.push(xPart);
    const colorEnc = spec.encodings.color;
    if (colorEnc && seriesName && !derived.folded) {
      const f = fieldOf(table.fields, colorEnc.fid);
      parts.push({
        fid: colorEnc.fid,
        value: seriesName,
        label: f?.displayName ?? colorEnc.fid,
        valueLabel: seriesName,
      });
    }
    if (parts.length > 0) onDatumClick({ parts });
  };

  const margin = compact
    ? { top: 4, right: 4, bottom: 0, left: 0 }
    : { top: 8, right: 12, bottom: 4, left: 4 };
  const axisProps = {
    tickLine: false,
    axisLine: false,
    tick: { fontSize: 11, fill: "var(--color-muted-foreground)" },
  } as const;
  const gridStroke = "var(--color-border)";
  const tooltip = compact ? null : (
    <RechartsTooltip
      cursor={{ fill: "color-mix(in oklch, var(--color-muted) 50%, transparent)" }}
      content={<ChartTooltipContent xFormatter={xInfo.formatter} valueFormatter={valueFormatter} />}
    />
  );

  const surface = (() => {
    switch (derived.mark) {
      case "kpi": {
        const key = derived.keys.measures[0];
        const v = result.rows[0]?.[key];
        const enc = spec.encodings.y?.[0];
        const f = enc ? fieldOf(table.fields, enc.fid) : undefined;
        return (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-4">
            <div className={cn("font-semibold tabular-nums tracking-tight", compact ? "text-2xl" : "text-4xl")}>
              {typeof v === "number" ? valueFormatter(v) : "—"}
            </div>
            {f && (
              <div className="text-xs text-muted-foreground">
                {spec.meta.title ?? `${f.displayName}`}
              </div>
            )}
          </div>
        );
      }
      case "table": {
        const cols = result.columns.slice(0, 8);
        return (
          <div className="h-full overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr>
                  {cols.map((c) => (
                    <th key={c} className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                      {table.fields.find((f) => f.fid === c)?.displayName ?? c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-border/60">
                    {cols.map((c) => (
                      <td key={c} className="px-2 py-1 tabular-nums">
                        {formatCell(r[c], table.fields.find((f) => f.fid === c))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      case "arc": {
        const thetaKey = derived.keys.theta ?? derived.keys.measures[0];
        const colorKey = derived.keys.color;
        if (!colorKey) return <CenteredNote title="구성비 차트에는 색상(범례) 필드가 필요합니다" />;
        const top = result.rows.slice(0, 10);
        const rest = result.rows.slice(10);
        const restSum = rest.reduce(
          (a, r) => a + (typeof r[thetaKey] === "number" ? (r[thetaKey] as number) : 0),
          0,
        );
        const data = [
          ...top.map((r) => ({ name: String(r[colorKey]), value: r[thetaKey] as number })),
          ...(restSum > 0 ? [{ name: "기타", value: restSum }] : []),
        ];
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={margin}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="52%"
                outerRadius="82%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              {tooltip}
            </PieChart>
          </ResponsiveContainer>
        );
      }
      case "rect": {
        const yEnc = spec.encodings.y?.[0];
        const yKeyDim = yEnc ? (derived.query.view.type === "aggregate" ? derived.query.view.groupBy.find((g) => g !== xKey) : undefined) : undefined;
        if (!yKeyDim) return <CenteredNote title="히트맵에는 X·Y 두 dimension이 필요합니다" />;
        return (
          <HeatmapSurface
            rows={result.rows}
            xKey={xKey ?? ""}
            yKey={yKeyDim}
            measureKey={derived.keys.measures[0] ?? "count"}
            xFormatter={xInfo.formatter}
            compact={compact}
            onCellClick={
              onDatumClick
                ? (x, y) => {
                    const parts: DatumClickPayload["parts"] = [];
                    const xPart = makeXPart(x);
                    if (xPart) parts.push(xPart);
                    const ye = spec.encodings.y?.[0];
                    if (ye && !ye.bucket) {
                      const f = fieldOf(table.fields, ye.fid);
                      parts.push({ fid: ye.fid, value: y, label: f?.displayName ?? "", valueLabel: String(y) });
                    }
                    if (parts.length) onDatumClick({ parts });
                  }
                : undefined
            }
          />
        );
      }
      case "boxplot": {
        return (
          <BoxplotSurface
            rows={result.rows}
            xKey={xKey ?? ""}
            measureKey={derived.keys.measures[0] ?? ""}
            xFormatter={xInfo.formatter}
            valueFormatter={valueFormatter}
            compact={compact}
          />
        );
      }
      case "point": {
        const [mx, my] = [derived.keys.x, derived.keys.measures[0]];
        const xField = spec.encodings.x ? fieldOf(table.fields, spec.encodings.x.fid) : undefined;
        const xIsNumeric = xField?.semanticType === "quantitative";
        const sizeKey = derived.keys.size;
        const colorKey = derived.keys.color;
        const shapeKey = derived.keys.shape;
        const opacityKey = derived.keys.opacity;

        // 대량 산점도: 개별 SVG 심볼 대신 밀도 래스터(전 포인트·다운샘플링 없음) + 줌/팬
        if (result.rows.length > SCATTER_RASTER_MIN && xIsNumeric && mx && my) {
          const yField = spec.encodings.y?.[0] ? fieldOf(table.fields, spec.encodings.y[0].fid) : undefined;
          return (
            <RasterScatter
              rows={result.rows}
              xKey={mx}
              yKey={my}
              colorKey={colorKey}
              xLabel={xField?.displayName ?? "x"}
              yLabel={yField?.displayName ?? "y"}
              paletteVars={CHART_COLORS}
            />
          );
        }

        const pts = result.rows.slice(0, SCATTER_RASTER_MIN);
        const { opacityScale, seriesDefs } = buildScatterSeries(pts, CHART_COLORS, {
          colorKey,
          shapeKey,
          opacityKey,
        });
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={margin}>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis
                {...axisProps}
                dataKey={mx}
                name={xField?.displayName ?? "x"}
                type={xIsNumeric ? "number" : "category"}
                domain={xIsNumeric ? ["auto", "auto"] : undefined}
                allowDuplicatedCategory={false}
                tickFormatter={xIsNumeric ? (v) => formatNumber(v as number) : undefined}
              />
              <YAxis
                {...axisProps}
                dataKey={my}
                name={spec.encodings.y?.[0] ? fieldOf(table.fields, spec.encodings.y[0].fid)?.displayName : "y"}
                type="number"
                domain={["auto", "auto"]}
                width={52}
                tickFormatter={(v) => formatNumber(v as number)}
              />
              {sizeKey && <ZAxis dataKey={sizeKey} range={[24, 240]} />}
              {tooltip}
              {seriesDefs.map((sd, i) => (
                <Scatter key={i} name={sd.name} data={sd.data} fill={sd.fill} shape={sd.symbol} fillOpacity={opacityScale ? undefined : 0.72}>
                  {opacityScale &&
                    sd.data.map((r, j) => <Cell key={j} fill={sd.fill} fillOpacity={opacityScale(r[opacityKey!])} />)}
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );
      }
      default: {
        // bar / line / area
        const { data, series } = seriesData;
        const dashed = seriesData.dashed;
        const stacked = spec.stack !== "none" && series.length > 1;
        const common = {
          data,
          margin,
        } as const;
        const xAxis = (
          <XAxis
            {...axisProps}
            dataKey={xKey}
            tickFormatter={(v) => xInfo.formatter(v as Scalar)}
            interval="preserveStartEnd"
            minTickGap={28}
            hide={compact}
          />
        );
        const yAxis = (
          <YAxis
            {...axisProps}
            width={52}
            tickFormatter={(v) => valueFormatter(v as number)}
            hide={compact}
            domain={spec.stack === "normalize" ? [0, 1] : undefined}
          />
        );
        const grid = <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />;
        if (derived.mark === "line") {
          return (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart {...common}>
                {grid}
                {xAxis}
                {yAxis}
                {tooltip}
                {series.map((s, i) => (
                  <Line
                    key={s}
                    dataKey={s}
                    name={seriesLabelOf(s)}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    strokeDasharray={dashed.has(s) ? "5 4" : undefined}
                    dot={false}
                    connectNulls={dashed.has(s)}
                    activeDot={{ r: 4, onClick: (_e, p) => clickHandler((p as { payload?: Record<string, Scalar> }).payload, s) }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          );
        }
        if (derived.mark === "area") {
          return (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart {...common}>
                {grid}
                {xAxis}
                {yAxis}
                {tooltip}
                {series.map((s, i) => (
                  <Area
                    key={s}
                    dataKey={s}
                    name={seriesLabelOf(s)}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    fillOpacity={dashed.has(s) ? 0 : 0.18}
                    strokeWidth={2}
                    strokeDasharray={dashed.has(s) ? "5 4" : undefined}
                    connectNulls={dashed.has(s)}
                    stackId={stacked && !dashed.has(s) ? "a" : undefined}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );
        }
        const horizontal = false;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...common} layout={horizontal ? "vertical" : "horizontal"}>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip}
              {series.map((s, i) => (
                <Bar
                  key={s}
                  dataKey={s}
                  name={seriesLabelOf(s)}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  stackId={stacked ? "a" : undefined}
                  radius={stacked ? 0 : [3, 3, 0, 0]}
                  maxBarSize={48}
                  onClick={(p) => clickHandler((p as { payload?: Record<string, Scalar> }).payload, s)}
                  cursor={onDatumClick ? "pointer" : undefined}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      }
    }
  })();

  const legendSeries =
    !compact && ["bar", "line", "area"].includes(derived.mark) && pivoted.series.length > 1
      ? pivoted.series
      : null;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1">{surface}</div>
      {legendSeries && spec.style.legend !== "hidden" && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pb-1.5 pt-1">
          {legendSeries.slice(0, MAX_SERIES).map((s, i) => (
            <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="size-2 rounded-[3px]" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              {seriesLabelOf(s)}
            </span>
          ))}
          {pivoted.droppedSeries > 0 && (
            <span className="text-[11px] text-muted-foreground/70">+{pivoted.droppedSeries}개 생략</span>
          )}
        </div>
      )}
    </div>
  );
}
