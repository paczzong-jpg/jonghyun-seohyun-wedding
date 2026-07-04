import PptxGenJS from "pptxgenjs";

import {
  DECK_THEMES,
  mixHex,
  slideBgColor,
  slideInkColor,
  slideLineColor,
  slideMutedColor,
  type DeckTheme,
} from "./themes";
import type {
  ChartSlide,
  DeckConfig,
  SlideImage,
  SlideSpec,
} from "./types";

// ────────────────────────────────────────────────
// HTML(1280×720px) 좌표를 그대로 인치(13.333×7.5in, 96dpi)로 매핑해
// 화면과 동일한 구도의 "편집 가능한" PPTX 를 만든다.
// 색·폰트는 themes.ts 의 같은 계산을 공유한다.
// ────────────────────────────────────────────────

const PAGE_W = 13.333;
const PAGE_H = 7.5;

/** px → inch */
const px = (v: number) => v / 96;
/** CSS px 폰트 → PPT pt */
const pt = (v: number) => Math.round(v * 0.75 * 10) / 10;
/** "#RRGGBB" → pptxgenjs hex */
const c = (hex: string) => hex.replace("#", "");

type Ctx = {
  theme: DeckTheme;
  /** 이 슬라이드의 배경 변형이 반영된 실제 색 */
  bg: string;
  ink: string;
  muted: string;
  line: string;
  accentSoft: string;
  fontD: string;
  fontB: string;
};

function makeCtx(theme: DeckTheme, background: SlideSpec["background"]): Ctx {
  const bg = slideBgColor(theme, background);
  return {
    theme,
    bg,
    ink: slideInkColor(theme, background),
    muted: slideMutedColor(theme, background),
    line: slideLineColor(theme, background),
    accentSoft: mixHex(bg, theme.accent, theme.mode === "dark" ? 0.16 : 0.1),
    fontD: theme.pptxFontDisplay,
    fontB: theme.pptxFontBody,
  };
}

type Slide = ReturnType<PptxGenJS["addSlide"]>;

function addKicker(s: Slide, ctx: Ctx, text: string, x: number, y: number, withBar = false) {
  if (withBar) {
    s.addShape("rect", {
      x: px(x),
      y: px(y + 5),
      w: px(44),
      h: px(3),
      fill: { color: c(ctx.theme.accent) },
    });
  }
  s.addText(text.toUpperCase(), {
    x: px(withBar ? x + 58 : x),
    y: px(y - 6),
    w: px(700),
    h: px(24),
    fontSize: pt(13),
    fontFace: ctx.fontB,
    bold: true,
    charSpacing: 3,
    color: c(ctx.theme.accent),
    valign: "middle",
  });
}

/** 콘텐츠 슬라이드 공통 헤더 (kicker + 타이틀). 반환값: 본문 시작 y(px) */
function addHeader(s: Slide, ctx: Ctx, kicker: string | undefined, title: string): number {
  let y = 84;
  if (kicker) {
    addKicker(s, ctx, kicker, 88, y);
    y += 34;
  }
  const lines = title.split("\n").length;
  const h = lines * 54;
  s.addText(title, {
    x: px(88),
    y: px(y),
    w: px(900),
    h: px(h),
    fontSize: pt(46),
    fontFace: ctx.fontD,
    bold: true,
    color: c(ctx.ink),
    lineSpacingMultiple: 1.04,
    valign: "top",
  });
  return y + h + 30;
}

function addFooter(s: Slide, ctx: Ctx, config: DeckConfig, index: number, total: number) {
  if (config.footer) {
    s.addText(config.footer, {
      x: px(64),
      y: px(688 - 8),
      w: px(500),
      h: px(20),
      fontSize: pt(11.5),
      fontFace: ctx.fontB,
      bold: true,
      charSpacing: 1,
      color: c(ctx.muted),
    });
  }
  if (config.pageNumbers) {
    s.addText(`${String(index + 1).padStart(2, "0")} — ${String(total).padStart(2, "0")}`, {
      x: px(1280 - 64 - 200),
      y: px(688 - 8),
      w: px(200),
      h: px(20),
      align: "right",
      fontSize: pt(11.5),
      fontFace: ctx.fontB,
      bold: true,
      color: c(ctx.muted),
    });
  }
}

/** sparse 슬라이드 코너 워시 — 저투명 원으로 근사 */
function addWash(s: Slide, ctx: Ctx) {
  s.addShape("ellipse", {
    x: px(1000),
    y: px(-180),
    w: px(520),
    h: px(430),
    fill: { color: c(ctx.theme.accent), transparency: ctx.theme.mode === "dark" ? 86 : 91 },
    line: { type: "none" },
  });
  s.addShape("ellipse", {
    x: px(-160),
    y: px(520),
    w: px(430),
    h: px(360),
    fill: { color: c(ctx.theme.accent2), transparency: ctx.theme.mode === "dark" ? 87 : 91 },
    line: { type: "none" },
  });
}

/** 이미지 src → dataURL (실패 시 null → 플레이스홀더) */
async function fetchImageData(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** 이미지 또는 테마 추상 플레이스홀더 */
async function addImageBox(
  s: Slide,
  ctx: Ctx,
  image: SlideImage,
  box: { x: number; y: number; w: number; h: number },
  rounding = true,
) {
  const data = image.src ? await fetchImageData(image.src) : null;
  if (data) {
    s.addImage({
      data,
      x: px(box.x),
      y: px(box.y),
      w: px(box.w),
      h: px(box.h),
      sizing: { type: "cover", w: px(box.w), h: px(box.h) },
    });
    return;
  }
  const opts = {
    x: px(box.x),
    y: px(box.y),
    w: px(box.w),
    h: px(box.h),
    fill: { color: c(mixHex(ctx.bg, ctx.theme.surface, 0.55)) },
    line: { color: c(ctx.line), width: 1 },
    rectRadius: rounding ? px(Math.min(ctx.theme.radius, 20)) : 0,
  };
  s.addShape("roundRect", opts);
  s.addShape("ellipse", {
    x: px(box.x + box.w * 0.62),
    y: px(box.y + box.h * 0.14),
    w: px(box.w * 0.24),
    h: px(box.w * 0.24),
    fill: { color: c(ctx.theme.accent), transparency: 62 },
    line: { type: "none" },
  });
  s.addShape("ellipse", {
    x: px(box.x + box.w * 0.1),
    y: px(box.y + box.h * 0.5),
    w: px(box.w * 0.34),
    h: px(box.w * 0.34),
    fill: { color: c(ctx.theme.accent2), transparency: 70 },
    line: { type: "none" },
  });
  s.addText(image.alt, {
    x: px(box.x + 20),
    y: px(box.y + box.h - 44),
    w: px(box.w - 40),
    h: px(28),
    fontSize: pt(12),
    fontFace: ctx.fontB,
    color: c(ctx.muted),
  });
}

// ────────────────────────────────────────────────
// 레이아웃별 내보내기
// ────────────────────────────────────────────────

function exportTitle(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "title" }>) {
  addWash(s, ctx);
  if (spec.kicker) addKicker(s, ctx, spec.kicker, 88, 100, true);
  const titleLines = spec.title.split("\n").length;
  const titleH = titleLines * 88;
  let y = 372 - titleH / 2;
  s.addText(spec.title, {
    x: px(88),
    y: px(y),
    w: px(980),
    h: px(titleH),
    fontSize: pt(78),
    fontFace: ctx.fontD,
    bold: true,
    color: c(ctx.ink),
    lineSpacingMultiple: 1.02,
    valign: "top",
  });
  y += titleH + 28;
  if (spec.subtitle) {
    s.addText(spec.subtitle, {
      x: px(88),
      y: px(y),
      w: px(760),
      h: px(64),
      fontSize: pt(21),
      fontFace: ctx.fontB,
      color: c(ctx.muted),
      lineSpacingMultiple: 1.3,
      valign: "top",
    });
  }
  s.addShape("line", {
    x: px(88),
    y: px(622),
    w: px(1104),
    h: 0,
    line: { color: c(ctx.line), width: 1 },
  });
  const meta = [spec.presenter, spec.date].filter(Boolean).join("   ·   ");
  if (meta) {
    s.addText(meta, {
      x: px(88),
      y: px(640),
      w: px(900),
      h: px(26),
      fontSize: pt(15),
      fontFace: ctx.fontB,
      bold: true,
      color: c(ctx.ink),
    });
  }
}

function exportAgenda(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "agenda" }>) {
  addKicker(s, ctx, "Agenda", 88, 106);
  s.addText(spec.title, {
    x: px(88),
    y: px(140),
    w: px(300),
    h: px(160),
    fontSize: pt(46),
    fontFace: ctx.fontD,
    bold: true,
    color: c(ctx.ink),
    lineSpacingMultiple: 1.06,
    valign: "top",
  });
  const items = spec.items;
  const startY = 130;
  const areaH = 720 - startY - 130;
  const rowH = Math.min(96, areaH / items.length);
  const listY = startY + (areaH - rowH * items.length) / 2;
  items.forEach((item, i) => {
    const y = listY + i * rowH;
    s.addShape("line", {
      x: px(460),
      y: px(y),
      w: px(732),
      h: 0,
      line: { color: c(ctx.line), width: 1 },
    });
    s.addText(String(i + 1).padStart(2, "0"), {
      x: px(460),
      y: px(y + 16),
      w: px(44),
      h: px(24),
      fontSize: pt(15),
      fontFace: ctx.fontB,
      bold: true,
      color: c(ctx.theme.accent),
    });
    s.addText(item.label, {
      x: px(520),
      y: px(y + 12),
      w: px(660),
      h: px(30),
      fontSize: pt(19),
      fontFace: ctx.fontB,
      bold: true,
      color: c(ctx.ink),
    });
    if (item.note) {
      s.addText(item.note, {
        x: px(520),
        y: px(y + 44),
        w: px(660),
        h: px(24),
        fontSize: pt(13.5),
        fontFace: ctx.fontB,
        color: c(ctx.muted),
      });
    }
  });
}

function exportSection(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "section" }>) {
  addWash(s, ctx);
  s.addText(spec.index, {
    x: px(760),
    y: px(10),
    w: px(460),
    h: px(330),
    align: "right",
    fontSize: pt(320),
    fontFace: ctx.fontD,
    bold: true,
    color: c(ctx.line),
    transparency: 40,
    valign: "top",
  });
  s.addText(spec.index, {
    x: px(88),
    y: px(388),
    w: px(80),
    h: px(36),
    fontSize: pt(30),
    fontFace: ctx.fontD,
    bold: true,
    color: c(ctx.theme.accent),
  });
  s.addShape("rect", {
    x: px(170),
    y: px(406),
    w: px(56),
    h: px(3),
    fill: { color: c(ctx.theme.accent) },
  });
  const titleLines = spec.title.split("\n").length;
  s.addText(spec.title, {
    x: px(88),
    y: px(446),
    w: px(900),
    h: px(titleLines * 72),
    fontSize: pt(64),
    fontFace: ctx.fontD,
    bold: true,
    color: c(ctx.ink),
    lineSpacingMultiple: 1.02,
    valign: "top",
  });
  if (spec.subtitle) {
    s.addText(spec.subtitle, {
      x: px(88),
      y: px(446 + titleLines * 72 + 20),
      w: px(720),
      h: px(34),
      fontSize: pt(21),
      fontFace: ctx.fontB,
      color: c(ctx.muted),
    });
  }
}

function exportStatement(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "statement" }>) {
  addWash(s, ctx);
  const runs: PptxGenJS.TextProps[] = [];
  if (spec.highlight && spec.text.includes(spec.highlight)) {
    const [before, ...rest] = spec.text.split(spec.highlight);
    if (before) runs.push({ text: before });
    runs.push({ text: spec.highlight, options: { color: c(ctx.theme.accent) } });
    const after = rest.join(spec.highlight);
    if (after) runs.push({ text: after });
  } else {
    runs.push({ text: spec.text });
  }
  const lines = Math.max(spec.text.split("\n").length, Math.ceil(spec.text.length / 24));
  const h = Math.min(lines * 80, 420);
  s.addText(runs, {
    x: px(110),
    y: px(360 - h / 2 - (spec.attribution ? 30 : 0)),
    w: px(1010),
    h: px(h),
    fontSize: pt(54),
    fontFace: ctx.fontD,
    bold: true,
    color: c(ctx.ink),
    lineSpacingMultiple: 1.18,
    valign: "middle",
  });
  if (spec.attribution) {
    const y = 360 + h / 2 + 14;
    s.addShape("rect", {
      x: px(110),
      y: px(y + 9),
      w: px(36),
      h: px(2),
      fill: { color: c(ctx.theme.accent) },
    });
    s.addText(spec.attribution, {
      x: px(160),
      y: px(y),
      w: px(700),
      h: px(22),
      fontSize: pt(14),
      fontFace: ctx.fontB,
      color: c(ctx.muted),
    });
  }
}

function exportQuote(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "quote" }>) {
  addWash(s, ctx);
  s.addText("“", {
    x: px(112),
    y: px(96),
    w: px(180),
    h: px(150),
    fontSize: pt(150),
    fontFace: ctx.fontD,
    bold: true,
    color: c(ctx.theme.accent),
    valign: "top",
  });
  const lines = spec.quote.split("\n").length;
  s.addText(spec.quote, {
    x: px(120),
    y: px(250),
    w: px(960),
    h: px(lines * 56 + 20),
    fontSize: pt(38),
    fontFace: ctx.fontD,
    color: c(ctx.ink),
    lineSpacingMultiple: 1.32,
    valign: "top",
  });
  const y = 250 + lines * 56 + 72;
  s.addShape("ellipse", {
    x: px(120),
    y: px(y),
    w: px(52),
    h: px(52),
    fill: { color: c(ctx.accentSoft) },
    line: { type: "none" },
  });
  s.addText(spec.name.slice(0, 2), {
    x: px(120),
    y: px(y),
    w: px(52),
    h: px(52),
    align: "center",
    fontSize: pt(17),
    fontFace: ctx.fontB,
    bold: true,
    color: c(ctx.theme.accent),
    valign: "middle",
  });
  s.addText(spec.name, {
    x: px(190),
    y: px(y + 2),
    w: px(500),
    h: px(24),
    fontSize: pt(16),
    fontFace: ctx.fontB,
    bold: true,
    color: c(ctx.ink),
  });
  if (spec.role) {
    s.addText(spec.role, {
      x: px(190),
      y: px(y + 28),
      w: px(500),
      h: px(22),
      fontSize: pt(13.5),
      fontFace: ctx.fontB,
      color: c(ctx.muted),
    });
  }
}

function exportBullets(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "bullets" }>) {
  const bodyY = addHeader(s, ctx, spec.kicker, spec.title);
  const columns = spec.columns ?? 1;
  const rows = Math.ceil(spec.bullets.length / columns);
  const areaH = 720 - bodyY - 100;
  const rowH = Math.min(110, areaH / rows);
  const colW = columns === 1 ? 1104 : 524;
  spec.bullets.forEach((b, i) => {
    const col = columns === 1 ? 0 : i % 2;
    const row = columns === 1 ? i : Math.floor(i / 2);
    const x = 88 + col * (colW + 56);
    const y = bodyY + (areaH - rowH * rows) / 2 + row * rowH;
    s.addShape("line", {
      x: px(x),
      y: px(y),
      w: px(colW),
      h: 0,
      line: { color: c(ctx.line), width: 1 },
    });
    s.addShape("ellipse", {
      x: px(x),
      y: px(y + 20),
      w: px(30),
      h: px(30),
      fill: { color: c(ctx.accentSoft) },
      line: { type: "none" },
    });
    s.addText(String(i + 1).padStart(2, "0"), {
      x: px(x),
      y: px(y + 20),
      w: px(30),
      h: px(30),
      align: "center",
      fontSize: pt(11),
      fontFace: ctx.fontB,
      bold: true,
      color: c(ctx.theme.accent),
      valign: "middle",
    });
    s.addText(b.title, {
      x: px(x + 48),
      y: px(y + 16),
      w: px(colW - 48),
      h: px(28),
      fontSize: pt(19),
      fontFace: ctx.fontB,
      bold: true,
      color: c(ctx.ink),
    });
    if (b.desc) {
      s.addText(b.desc, {
        x: px(x + 48),
        y: px(y + 48),
        w: px(colW - 48),
        h: px(rowH - 54),
        fontSize: pt(15),
        fontFace: ctx.fontB,
        color: c(ctx.muted),
        lineSpacingMultiple: 1.25,
        valign: "top",
      });
    }
  });
}

async function exportTextImage(
  s: Slide,
  ctx: Ctx,
  spec: Extract<SlideSpec, { layout: "text-image" }>,
) {
  const imageFirst = spec.imageSide === "left";
  const textX = imageFirst ? 680 : 88;
  const imgX = imageFirst ? 88 : 672;
  await addImageBox(s, ctx, spec.image, { x: imgX, y: 128, w: 520, h: 440 });
  if (spec.image.caption) {
    s.addText(spec.image.caption, {
      x: px(imgX),
      y: px(580),
      w: px(520),
      h: px(22),
      fontSize: pt(12.5),
      fontFace: ctx.fontB,
      color: c(ctx.muted),
    });
  }
  let y = 150;
  if (spec.kicker) {
    addKicker(s, ctx, spec.kicker, textX, y);
    y += 34;
  }
  const titleLines = spec.title.split("\n").length;
  s.addText(spec.title, {
    x: px(textX),
    y: px(y),
    w: px(512),
    h: px(titleLines * 54),
    fontSize: pt(46),
    fontFace: ctx.fontD,
    bold: true,
    color: c(ctx.ink),
    lineSpacingMultiple: 1.04,
    valign: "top",
  });
  y += titleLines * 54 + 20;
  for (const p of spec.body ?? []) {
    const h = Math.ceil(p.length / 28) * 26 + 10;
    s.addText(p, {
      x: px(textX),
      y: px(y),
      w: px(480),
      h: px(h),
      fontSize: pt(16),
      fontFace: ctx.fontB,
      color: c(ctx.muted),
      lineSpacingMultiple: 1.35,
      valign: "top",
    });
    y += h + 8;
  }
  if (spec.bullets?.length) {
    y += 10;
    for (const b of spec.bullets) {
      s.addShape("ellipse", {
        x: px(textX + 2),
        y: px(y + 8),
        w: px(6),
        h: px(6),
        fill: { color: c(ctx.theme.accent) },
        line: { type: "none" },
      });
      const h = Math.ceil(b.length / 30) * 24 + 6;
      s.addText(b, {
        x: px(textX + 22),
        y: px(y - 2),
        w: px(470),
        h: px(h),
        fontSize: pt(15.5),
        fontFace: ctx.fontB,
        color: c(ctx.ink),
        lineSpacingMultiple: 1.25,
        valign: "top",
      });
      y += h + 8;
    }
  }
}

async function exportMedia(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "media" }>) {
  await addImageBox(s, ctx, spec.image, { x: 0, y: 0, w: 1280, h: 720 }, false);
  if (spec.title || spec.caption) {
    s.addShape("rect", {
      x: 0,
      y: px(440),
      w: PAGE_W,
      h: px(280),
      fill: { color: "000000", transparency: 42 },
      line: { type: "none" },
    });
    if (spec.title) {
      s.addText(spec.title, {
        x: px(88),
        y: px(520),
        w: px(1000),
        h: px(64),
        fontSize: pt(52),
        fontFace: ctx.fontD,
        bold: true,
        color: "FFFFFF",
        valign: "top",
      });
    }
    if (spec.caption) {
      s.addText(spec.caption, {
        x: px(88),
        y: px(600),
        w: px(720),
        h: px(52),
        fontSize: pt(17),
        fontFace: ctx.fontB,
        color: "E6E6E6",
        lineSpacingMultiple: 1.3,
        valign: "top",
      });
    }
  }
}

function exportMetrics(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "metrics" }>) {
  const bodyY = addHeader(s, ctx, spec.kicker, spec.title) + 6;
  const count = spec.items.length;
  const cols = count <= 3 ? count : count === 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const gap = 24;
  const areaW = 1104;
  const areaH = 720 - bodyY - 104;
  const cardW = (areaW - gap * (cols - 1)) / cols;
  const cardH = (areaH - gap * (rows - 1)) / rows;
  const valueSize = count <= 3 ? 76 : count === 4 ? 64 : 54;
  spec.items.forEach((m, i) => {
    const x = 88 + (i % cols) * (cardW + gap);
    const y = bodyY + Math.floor(i / cols) * (cardH + gap);
    s.addShape("roundRect", {
      x: px(x),
      y: px(y),
      w: px(cardW),
      h: px(cardH),
      fill: { color: c(ctx.theme.surface) },
      line: { color: c(ctx.line), width: 1 },
      rectRadius: px(Math.min(ctx.theme.radius, 20)),
    });
    s.addText(m.label.toUpperCase(), {
      x: px(x + 30),
      y: px(y + 24),
      w: px(cardW - 60),
      h: px(20),
      fontSize: pt(12),
      fontFace: ctx.fontB,
      bold: true,
      charSpacing: 2,
      color: c(ctx.muted),
    });
    s.addText(m.value, {
      x: px(x + 30),
      y: px(y + cardH - (m.delta ? 118 : 86)),
      w: px(cardW - 60),
      h: px(valueSize + 10),
      fontSize: pt(valueSize),
      fontFace: ctx.fontD,
      bold: true,
      color: c(ctx.ink),
      valign: "top",
    });
    if (m.delta) {
      const arrow = m.trend === "down" ? "↘" : m.trend === "flat" ? "→" : "↗";
      s.addText(`${arrow}  ${m.delta}`, {
        x: px(x + 30),
        y: px(y + cardH - 44),
        w: px(cardW - 60),
        h: px(22),
        fontSize: pt(14),
        fontFace: ctx.fontB,
        bold: true,
        color: c(ctx.theme.accent),
      });
    }
  });
}

function exportCards(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "cards" }>) {
  const bodyY = addHeader(s, ctx, spec.kicker, spec.title) + 4;
  const count = spec.cards.length;
  const cols = count <= 3 ? count : count === 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const gap = 22;
  const cardW = (1104 - gap * (cols - 1)) / cols;
  const cardH = (720 - bodyY - 104 - gap * (rows - 1)) / rows;
  spec.cards.forEach((card, i) => {
    const x = 88 + (i % cols) * (cardW + gap);
    const y = bodyY + Math.floor(i / cols) * (cardH + gap);
    s.addShape("roundRect", {
      x: px(x),
      y: px(y),
      w: px(cardW),
      h: px(cardH),
      fill: { color: c(ctx.theme.surface) },
      line: { color: c(ctx.line), width: 1 },
      rectRadius: px(Math.min(ctx.theme.radius, 20)),
    });
    s.addShape("roundRect", {
      x: px(x + 28),
      y: px(y + 26),
      w: px(46),
      h: px(46),
      fill: { color: c(ctx.accentSoft) },
      line: { type: "none" },
      rectRadius: px(10),
    });
    if (card.tag) {
      s.addText(card.tag, {
        x: px(x + cardW - 128),
        y: px(y + 32),
        w: px(100),
        h: px(24),
        align: "right",
        fontSize: pt(11),
        fontFace: ctx.fontB,
        bold: true,
        charSpacing: 1,
        color: c(ctx.theme.accent),
      });
    }
    s.addText(card.title, {
      x: px(x + 28),
      y: px(y + cardH - 108),
      w: px(cardW - 56),
      h: px(30),
      fontSize: pt(20),
      fontFace: ctx.fontB,
      bold: true,
      color: c(ctx.ink),
    });
    s.addText(card.desc, {
      x: px(x + 28),
      y: px(y + cardH - 76),
      w: px(cardW - 56),
      h: px(60),
      fontSize: pt(14.5),
      fontFace: ctx.fontB,
      color: c(ctx.muted),
      lineSpacingMultiple: 1.25,
      valign: "top",
    });
  });
}

function exportTimeline(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "timeline" }>) {
  const headerEnd = addHeader(s, ctx, spec.kicker, spec.title);
  // HTML 레이아웃과 동일하게 남은 영역에 수직 센터링 (콘텐츠 높이 ≈ 230px)
  const bodyY = headerEnd + Math.max(22, (720 - 120 - headerEnd - 230) / 2);
  const count = spec.steps.length;
  const gap = 28;
  const colW = (1104 - gap * (count - 1)) / count;
  s.addShape("line", {
    x: px(88),
    y: px(bodyY + 12),
    w: px(1104),
    h: 0,
    line: { color: c(ctx.line), width: 1.5 },
  });
  spec.steps.forEach((step, i) => {
    const x = 88 + i * (colW + gap);
    const status = step.status ?? "next";
    s.addShape("ellipse", {
      x: px(x),
      y: px(bodyY),
      w: px(24),
      h: px(24),
      fill: { color: status === "next" ? c(ctx.bg) : c(ctx.theme.accent) },
      line: { color: status === "next" ? c(ctx.line) : c(ctx.theme.accent), width: 2 },
    });
    if (status === "done") {
      s.addText("✓", {
        x: px(x),
        y: px(bodyY),
        w: px(24),
        h: px(24),
        align: "center",
        fontSize: pt(11),
        bold: true,
        color: c(ctx.bg),
        valign: "middle",
      });
    }
    s.addText(step.label.toUpperCase(), {
      x: px(x),
      y: px(bodyY + 42),
      w: px(colW),
      h: px(18),
      fontSize: pt(11.5),
      fontFace: ctx.fontB,
      bold: true,
      charSpacing: 2,
      color: status === "next" ? c(ctx.muted) : c(ctx.theme.accent),
    });
    s.addText(step.title, {
      x: px(x),
      y: px(bodyY + 68),
      w: px(colW),
      h: px(52),
      fontSize: pt(18),
      fontFace: ctx.fontB,
      bold: true,
      color: c(ctx.ink),
      lineSpacingMultiple: 1.15,
      valign: "top",
    });
    if (step.desc) {
      s.addText(step.desc, {
        x: px(x),
        y: px(bodyY + 124),
        w: px(colW - 8),
        h: px(80),
        fontSize: pt(14),
        fontFace: ctx.fontB,
        color: c(ctx.muted),
        lineSpacingMultiple: 1.3,
        valign: "top",
      });
    }
  });
}

function exportCompare(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "compare" }>) {
  const bodyY = addHeader(s, ctx, spec.kicker, spec.title) + 4;
  const count = spec.columns.length;
  const gap = 22;
  const colW = (1104 - gap * (count - 1)) / count;
  const colH = 720 - bodyY - 104;
  spec.columns.forEach((col, i) => {
    const x = 88 + i * (colW + gap);
    s.addShape("roundRect", {
      x: px(x),
      y: px(bodyY),
      w: px(colW),
      h: px(colH),
      fill: { color: c(ctx.theme.surface) },
      line: { color: col.highlight ? c(ctx.theme.accent) : c(ctx.line), width: col.highlight ? 2 : 1 },
      rectRadius: px(Math.min(ctx.theme.radius, 20)),
    });
    s.addText(col.title, {
      x: px(x + 30),
      y: px(bodyY + 26),
      w: px(colW - 140),
      h: px(30),
      fontSize: pt(21),
      fontFace: ctx.fontB,
      bold: true,
      color: c(ctx.ink),
    });
    if (col.tag) {
      s.addShape("roundRect", {
        x: px(x + colW - 108),
        y: px(bodyY + 26),
        w: px(78),
        h: px(28),
        fill: { color: col.highlight ? c(ctx.theme.accent) : c(ctx.accentSoft) },
        line: { type: "none" },
        rectRadius: px(14),
      });
      s.addText(col.tag, {
        x: px(x + colW - 108),
        y: px(bodyY + 26),
        w: px(78),
        h: px(28),
        align: "center",
        fontSize: pt(11),
        fontFace: ctx.fontB,
        bold: true,
        color: col.highlight ? c(ctx.bg) : c(ctx.theme.accent),
        valign: "middle",
      });
    }
    s.addShape("line", {
      x: px(x + 30),
      y: px(bodyY + 74),
      w: px(colW - 60),
      h: 0,
      line: { color: c(ctx.line), width: 1 },
    });
    let y = bodyY + 92;
    for (const p of col.points) {
      s.addShape("ellipse", {
        x: px(x + 30),
        y: px(y + 3),
        w: px(18),
        h: px(18),
        fill: { color: c(ctx.accentSoft) },
        line: { type: "none" },
      });
      s.addText("✓", {
        x: px(x + 30),
        y: px(y + 3),
        w: px(18),
        h: px(18),
        align: "center",
        fontSize: pt(9),
        bold: true,
        color: c(ctx.theme.accent),
        valign: "middle",
      });
      const h = Math.ceil(p.length / 22) * 22 + 8;
      s.addText(p, {
        x: px(x + 58),
        y: px(y - 2),
        w: px(colW - 88),
        h: px(h),
        fontSize: pt(14.5),
        fontFace: ctx.fontB,
        color: c(ctx.ink),
        lineSpacingMultiple: 1.25,
        valign: "top",
      });
      y += h + 10;
    }
  });
}

function exportTable(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "table" }>) {
  const bodyY = addHeader(s, ctx, spec.kicker, spec.title) + 6;
  const emphasis = spec.emphasisCol;
  const header: PptxGenJS.TableRow = spec.columns.map((col, cIdx) => ({
    text: col.toUpperCase(),
    options: {
      bold: true,
      fontSize: pt(12.5),
      fontFace: ctx.fontB,
      charSpacing: 1,
      color: cIdx === emphasis ? c(ctx.theme.accent) : c(ctx.muted),
      fill: { color: cIdx === emphasis ? c(ctx.accentSoft) : c(ctx.bg) },
      border: [
        { type: "none" },
        { type: "none" },
        { pt: 1.5, color: c(ctx.ink) },
        { type: "none" },
      ],
      valign: "middle",
    },
  }));
  const body: PptxGenJS.TableRow[] = spec.rows.map((row) =>
    row.map((cell, cIdx) => ({
      text: cell,
      options: {
        fontSize: pt(15),
        fontFace: ctx.fontB,
        bold: cIdx === 0 || cIdx === emphasis,
        color: c(ctx.ink),
        fill: { color: cIdx === emphasis ? c(ctx.accentSoft) : c(ctx.bg) },
        border: [
          { type: "none" },
          { type: "none" },
          { pt: 0.75, color: c(ctx.line) },
          { type: "none" },
        ],
        valign: "middle",
      },
    })),
  );
  s.addTable([header, ...body], {
    x: px(88),
    y: px(bodyY),
    w: px(1104),
    rowH: px(46),
    margin: [px(6), px(18), px(6), px(18)],
  });
}

function exportChart(s: Slide, ctx: Ctx, spec: ChartSlide) {
  const bodyY = addHeader(s, ctx, spec.kicker, spec.title) + 4;
  const hasTakeaways = Boolean(spec.takeaways?.length);
  const chartW = hasTakeaways ? 690 : 1104;
  const chartH = 720 - bodyY - 110;
  const { chart } = spec;
  const palette = ctx.theme.chart.map(c);

  const commonOpts: PptxGenJS.IChartOpts = {
    x: px(88),
    y: px(bodyY),
    w: px(chartW),
    h: px(chartH),
    chartColors: palette,
    catAxisLabelColor: c(ctx.muted),
    catAxisLabelFontSize: pt(12),
    catAxisLabelFontFace: ctx.fontB,
    valAxisLabelColor: c(ctx.muted),
    valAxisLabelFontSize: pt(12),
    valAxisLabelFontFace: ctx.fontB,
    catAxisLineColor: c(ctx.line),
    valGridLine: { color: c(ctx.line), style: "solid", size: 0.75 },
    catGridLine: { style: "none" },
    valAxisLineShow: false,
    showLegend: chart.series.length > 1 && chart.kind !== "donut",
    legendPos: "t",
    legendColor: c(ctx.muted),
    legendFontFace: ctx.fontB,
    legendFontSize: pt(12),
    dataLabelColor: c(ctx.muted),
    dataLabelFontFace: ctx.fontB,
  };

  if (chart.kind === "donut") {
    s.addChart(
      "doughnut",
      [{ name: chart.series[0]?.name ?? "값", labels: chart.labels, values: chart.series[0]?.data ?? [] }],
      {
        ...commonOpts,
        holeSize: 62,
        showLegend: true,
        legendPos: "r",
        showValue: false,
        dataBorder: { pt: 0, color: c(ctx.bg) },
      },
    );
  } else {
    const data = chart.series.map((series) => ({
      name: series.name,
      labels: chart.labels,
      values: series.data,
    }));
    const type: PptxGenJS.CHART_NAME =
      chart.kind === "bar" ? "bar" : chart.kind === "line" ? "line" : "area";
    s.addChart(type, data, {
      ...commonOpts,
      barDir: "col",
      barGapWidthPct: 60,
      lineSmooth: false,
      lineSize: chart.kind === "line" ? 3 : 2,
      chartArea: { fill: { color: c(ctx.bg) } },
      valAxisLabelFormatCode: chart.unit ? `0"${chart.unit}"` : "0",
    });
  }

  if (hasTakeaways) {
    let y = bodyY + 20;
    spec.takeaways!.forEach((t, i) => {
      s.addShape("line", {
        x: px(862),
        y: px(y),
        w: px(330),
        h: 0,
        line: { color: c(ctx.line), width: 1 },
      });
      s.addText(String(i + 1).padStart(2, "0"), {
        x: px(862),
        y: px(y + 14),
        w: px(36),
        h: px(20),
        fontSize: pt(13),
        fontFace: ctx.fontB,
        bold: true,
        color: c(ctx.theme.accent),
      });
      const h = Math.ceil(t.length / 18) * 24 + 14;
      s.addText(t, {
        x: px(906),
        y: px(y + 12),
        w: px(286),
        h: px(h),
        fontSize: pt(15),
        fontFace: ctx.fontB,
        color: c(ctx.ink),
        lineSpacingMultiple: 1.3,
        valign: "top",
      });
      y += h + 26;
    });
  }
}

async function exportGallery(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "gallery" }>) {
  const bodyY = addHeader(s, ctx, spec.kicker, spec.title) + 4;
  const count = spec.images.length;
  const cols = count <= 2 ? count : count === 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const gap = 20;
  const cellW = (1104 - gap * (cols - 1)) / cols;
  const cellH = (720 - bodyY - 104 - gap * (rows - 1)) / rows - 26;
  for (let i = 0; i < count; i++) {
    const img = spec.images[i];
    const x = 88 + (i % cols) * (cellW + gap);
    const y = bodyY + Math.floor(i / cols) * (cellH + 26 + gap);
    await addImageBox(s, ctx, img, { x, y, w: cellW, h: cellH });
    if (img.caption) {
      s.addText(img.caption, {
        x: px(x),
        y: px(y + cellH + 6),
        w: px(cellW),
        h: px(20),
        fontSize: pt(12.5),
        fontFace: ctx.fontB,
        color: c(ctx.muted),
      });
    }
  }
}

async function exportTeam(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "team" }>) {
  const bodyY = addHeader(s, ctx, spec.kicker, spec.title);
  const count = spec.people.length;
  const cols = count <= 3 ? count : count === 4 ? 4 : Math.ceil(count / 2);
  const rows = Math.ceil(count / cols);
  const cellW = 1104 / cols;
  const cellH = (720 - bodyY - 104) / rows;
  for (let i = 0; i < count; i++) {
    const person = spec.people[i];
    const cx = 88 + (i % cols) * cellW + cellW / 2;
    const cy = bodyY + Math.floor(i / cols) * cellH + cellH / 2 - 30;
    const photo = person.photo ? await fetchImageData(person.photo) : null;
    if (photo) {
      s.addImage({
        data: photo,
        x: px(cx - 54),
        y: px(cy - 54),
        w: px(108),
        h: px(108),
        rounding: true,
        sizing: { type: "cover", w: px(108), h: px(108) },
      });
    } else {
      s.addShape("ellipse", {
        x: px(cx - 54),
        y: px(cy - 54),
        w: px(108),
        h: px(108),
        fill: { color: c(ctx.accentSoft) },
        line: { color: c(ctx.line), width: 2 },
      });
      s.addText(person.name.slice(0, 2), {
        x: px(cx - 54),
        y: px(cy - 54),
        w: px(108),
        h: px(108),
        align: "center",
        fontSize: pt(30),
        fontFace: ctx.fontB,
        bold: true,
        color: c(ctx.theme.accent),
        valign: "middle",
      });
    }
    s.addText(person.name, {
      x: px(cx - cellW / 2 + 10),
      y: px(cy + 66),
      w: px(cellW - 20),
      h: px(26),
      align: "center",
      fontSize: pt(18),
      fontFace: ctx.fontB,
      bold: true,
      color: c(ctx.ink),
    });
    s.addText(person.role, {
      x: px(cx - cellW / 2 + 10),
      y: px(cy + 94),
      w: px(cellW - 20),
      h: px(22),
      align: "center",
      fontSize: pt(13.5),
      fontFace: ctx.fontB,
      color: c(ctx.muted),
    });
  }
}

function exportEnd(s: Slide, ctx: Ctx, spec: Extract<SlideSpec, { layout: "end" }>) {
  addWash(s, ctx);
  s.addShape("rect", {
    x: px(110),
    y: px(196),
    w: px(56),
    h: px(3),
    fill: { color: c(ctx.theme.accent) },
  });
  const titleLines = spec.title.split("\n").length;
  s.addText(spec.title, {
    x: px(110),
    y: px(228),
    w: px(1000),
    h: px(titleLines * 82),
    fontSize: pt(72),
    fontFace: ctx.fontD,
    bold: true,
    color: c(ctx.ink),
    lineSpacingMultiple: 1.02,
    valign: "top",
  });
  let y = 228 + titleLines * 82 + 26;
  if (spec.message) {
    s.addText(spec.message, {
      x: px(110),
      y: px(y),
      w: px(720),
      h: px(34),
      fontSize: pt(21),
      fontFace: ctx.fontB,
      color: c(ctx.muted),
    });
    y += 70;
  }
  if (spec.contact?.length) {
    spec.contact.forEach((contact, i) => {
      const x = 110 + i * 300;
      s.addText(contact.label.toUpperCase(), {
        x: px(x),
        y: px(y),
        w: px(280),
        h: px(18),
        fontSize: pt(11.5),
        fontFace: ctx.fontB,
        bold: true,
        charSpacing: 2,
        color: c(ctx.theme.accent),
      });
      s.addText(contact.value, {
        x: px(x),
        y: px(y + 24),
        w: px(280),
        h: px(24),
        fontSize: pt(17),
        fontFace: ctx.fontB,
        bold: true,
        color: c(ctx.ink),
      });
    });
  }
}

// ────────────────────────────────────────────────
// 진입점
// ────────────────────────────────────────────────

export async function exportDeckToPptx(config: DeckConfig, slides: SlideSpec[]) {
  const theme = DECK_THEMES[config.theme];
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "DECK_16x9", width: PAGE_W, height: PAGE_H });
  pptx.layout = "DECK_16x9";
  pptx.title = config.title;

  for (let i = 0; i < slides.length; i++) {
    const spec = slides[i];
    const ctx = makeCtx(theme, spec.background);
    const s = pptx.addSlide();
    s.background = { color: c(ctx.bg) };

    switch (spec.layout) {
      case "title":
        exportTitle(s, ctx, spec);
        break;
      case "agenda":
        exportAgenda(s, ctx, spec);
        break;
      case "section":
        exportSection(s, ctx, spec);
        break;
      case "statement":
        exportStatement(s, ctx, spec);
        break;
      case "quote":
        exportQuote(s, ctx, spec);
        break;
      case "bullets":
        exportBullets(s, ctx, spec);
        break;
      case "text-image":
        await exportTextImage(s, ctx, spec);
        break;
      case "media":
        await exportMedia(s, ctx, spec);
        break;
      case "metrics":
        exportMetrics(s, ctx, spec);
        break;
      case "cards":
        exportCards(s, ctx, spec);
        break;
      case "timeline":
        exportTimeline(s, ctx, spec);
        break;
      case "compare":
        exportCompare(s, ctx, spec);
        break;
      case "table":
        exportTable(s, ctx, spec);
        break;
      case "chart":
        exportChart(s, ctx, spec);
        break;
      case "gallery":
        await exportGallery(s, ctx, spec);
        break;
      case "team":
        await exportTeam(s, ctx, spec);
        break;
      case "end":
        exportEnd(s, ctx, spec);
        break;
    }

    const noFooter = spec.layout === "media" || spec.layout === "title";
    if (!noFooter) addFooter(s, ctx, config, i, slides.length);
    if (spec.notes) s.addNotes(spec.notes);
  }

  const fileName = `${config.title.replace(/[\\/:*?"<>|]/g, "_")}.pptx`;
  await pptx.writeFile({ fileName });
}
