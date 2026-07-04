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
  XAxis,
  YAxis,
} from "recharts";

import type { DeckTheme } from "@/lib/deck/themes";
import type { ChartSlide } from "@/lib/deck/types";

function toRows(chart: ChartSlide["chart"]) {
  return chart.labels.map((label, i) => {
    const row: Record<string, string | number> = { name: label };
    for (const s of chart.series) row[s.name] = s.data[i] ?? 0;
    return row;
  });
}

function ChartBody({ chart, theme }: { chart: ChartSlide["chart"]; theme: DeckTheme }) {
  const rows = toRows(chart);
  const palette = theme.chart;

  if (chart.kind === "donut") {
    const data = chart.labels.map((label, i) => ({
      name: label,
      value: chart.series[0]?.data[i] ?? 0,
    }));
    return (
      <div className="flex h-full items-center gap-[40px]">
        <ResponsiveContainer width="55%" height="92%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="92%"
              paddingAngle={2.5}
              strokeWidth={0}
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <ul className="flex flex-col gap-[14px]">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center gap-[12px]">
              <span
                className="inline-block h-[12px] w-[12px] rounded-[3px]"
                style={{ background: palette[i % palette.length] }}
              />
              <span className="text-[14.5px] font-semibold" style={{ color: "var(--deck-ink)" }}>
                {d.name}
              </span>
              <span className="deck-num text-[14.5px] font-bold" style={{ color: "var(--deck-muted)" }}>
                {d.value}
                {chart.unit ?? ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // recharts 는 SVG 속성에 CSS var() 를 적용하지 못하므로 테마 hex 를 직접 사용.
  // 축·그리드는 fragment 로 감싸면 recharts 가 인식하지 못해 차트마다 직접 배치한다.
  const tick = { fontSize: 12.5, fill: theme.muted };
  const common = {
    data: rows,
    margin: { top: 8, right: 12, bottom: 4, left: 0 },
  };
  const grid = { stroke: theme.line, vertical: false };
  const xAxis = {
    dataKey: "name",
    tick,
    tickLine: false,
    axisLine: { stroke: theme.line },
    tickMargin: 10,
  } as const;
  const yAxis = {
    tick,
    tickLine: false,
    axisLine: false,
    width: 56,
    unit: chart.unit,
  } as const;

  return (
    <ResponsiveContainer width="100%" height="100%">
      {chart.kind === "bar" ? (
        <BarChart {...common} barCategoryGap="28%">
          <CartesianGrid {...grid} />
          <XAxis {...xAxis} />
          <YAxis {...yAxis} />
          {chart.series.map((s, i) => (
            <Bar
              key={s.name}
              dataKey={s.name}
              fill={palette[i % palette.length]}
              radius={[5, 5, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      ) : chart.kind === "line" ? (
        <LineChart {...common}>
          <CartesianGrid {...grid} />
          <XAxis {...xAxis} />
          <YAxis {...yAxis} />
          {chart.series.map((s, i) => (
            <Line
              key={s.name}
              dataKey={s.name}
              stroke={palette[i % palette.length]}
              strokeWidth={3.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      ) : (
        <AreaChart {...common}>
          <CartesianGrid {...grid} />
          <XAxis {...xAxis} />
          <YAxis {...yAxis} />
          {chart.series.map((s, i) => (
            <Area
              key={s.name}
              dataKey={s.name}
              stroke={palette[i % palette.length]}
              fill={palette[i % palette.length]}
              fillOpacity={0.14}
              strokeWidth={3}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

export function ChartSlideView({ slide, theme }: { slide: ChartSlide; theme: DeckTheme }) {
  const hasTakeaways = Boolean(slide.takeaways?.length);
  const multiSeries = slide.chart.series.length > 1 && slide.chart.kind !== "donut";

  return (
    <div className="absolute inset-0 flex flex-col px-[88px] pt-[84px] pb-[88px]">
      <header className="flex items-end justify-between">
        <div style={{ maxWidth: 760 }}>
          {slide.kicker && <div className="deck-kicker">{slide.kicker}</div>}
          <h2 className="deck-slide-title mt-[14px] whitespace-pre-line">{slide.title}</h2>
        </div>
        {multiSeries && (
          <div className="flex gap-[20px] pb-[6px]">
            {slide.chart.series.map((s, i) => (
              <span key={s.name} className="flex items-center gap-[8px] text-[13px] font-semibold" style={{ color: "var(--deck-muted)" }}>
                <span
                  className="inline-block h-[10px] w-[10px] rounded-full"
                  style={{ background: theme.chart[i % theme.chart.length] }}
                />
                {s.name}
              </span>
            ))}
          </div>
        )}
      </header>
      <div className="mt-[30px] flex min-h-0 flex-1 gap-[52px]">
        <div className="min-w-0 flex-1">
          <ChartBody chart={slide.chart} theme={theme} />
        </div>
        {hasTakeaways && (
          <aside className="flex w-[330px] flex-none flex-col justify-center gap-[20px]">
            {slide.takeaways!.map((t, i) => (
              <div
                key={t}
                className="flex items-start gap-[14px] border-t pt-[16px]"
                style={{ borderColor: "var(--deck-line)" }}
              >
                <span className="deck-num text-[13px] font-extrabold" style={{ color: "var(--deck-accent)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[15px] font-medium leading-relaxed" style={{ color: "var(--deck-ink)" }}>
                  {t}
                </p>
              </div>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
