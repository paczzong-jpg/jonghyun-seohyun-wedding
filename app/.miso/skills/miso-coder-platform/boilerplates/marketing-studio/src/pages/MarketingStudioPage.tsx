import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CreativeCanvas } from "@/components/marketing/creative-canvas";
import { APP_TAGLINE } from "@/lib/marketing/config";
import { analyzeBrand, type AnalyzeProgress } from "@/lib/marketing/brand-analyzer";
import { createDemoWorkspace } from "@/lib/marketing/demo";
import { normalizeHex } from "@/lib/marketing/palette";
import { createBrand, deleteBrand, listBrands } from "@/lib/marketing/store";
import type { BrandKit } from "@/lib/marketing/types";

// 홈 — 오버사이즈 에디토리얼 히어로(URL 입력)와 브랜드 갤러리

const PROGRESS_LABEL: Record<AnalyzeProgress, string> = {
  scraping: "웹사이트 수집 중…",
  analyzing: "브랜드 DNA 분석 중…",
  done: "저장 중…",
};

function normalizeUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

// 히어로 콜라주용 정적 프리뷰 브랜드 — 네트워크·LLM 없이 엔진이 직접 렌더한다
const HERO_BRAND: BrandKit = {
  id: "hero-preview",
  url: "https://studio.example.com",
  name: "온새미로 티하우스",
  industry: "티 브랜드",
  tagline: "산에서 내려온 차 한 잔",
  valueProposition: "",
  toneOfVoice: [],
  personality: [],
  targetAudience: "",
  keyMessages: [],
  primaryColors: ["#0f4c5c", "#e9c46a"],
  secondaryColors: ["#f4efe6", "#9b2226"],
  fonts: ["Pretendard"],
  logoUrl: "",
  ogImageUrl: "",
  images: [],
  imageryStyle: "editorial",
  layoutStyle: "modern",
  language: "ko",
};

const HERO_PLATES = [
  {
    platformId: "instagram_feed",
    copy: { headline: "봄 산의 첫물차가 도착했습니다", body: "해발 800m 다원에서 이틀 전에 덖은 차.", cta: "지금 맛보기" },
    style: { archetype: "gradient", paletteIndex: 0, showLogo: true, bgImageUrl: "", textScale: 1 },
  },
  {
    platformId: "kakao_channel",
    copy: { headline: "우전 시즌 오픈", body: "올해 첫 수확 100상자 한정.", cta: "알림 받기" },
    style: { archetype: "badge", paletteIndex: 1, showLogo: true, bgImageUrl: "", textScale: 1 },
  },
  {
    platformId: "naver_blog_thumbnail",
    copy: { headline: "차를 우리는 세 가지 온도", body: "", cta: "" },
    style: { archetype: "pattern", paletteIndex: 3, showLogo: false, bgImageUrl: "", textScale: 1 },
  },
] as const;

function brandGradient(brand: BrandKit): string {
  const colors = [...brand.primaryColors, ...brand.secondaryColors]
    .map((c) => normalizeHex(c))
    .filter((c): c is string => Boolean(c))
    .slice(0, 4);
  if (colors.length === 0) return "linear-gradient(90deg, #e8501f, #eeeade)";
  if (colors.length === 1) return colors[0];
  return `linear-gradient(90deg, ${colors.join(", ")})`;
}

export function MarketingStudioPage() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<BrandKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);

  const refresh = () =>
    listBrands()
      .then(setBrands)
      .catch(() => toast.error("브랜드 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));

  useEffect(() => {
    void refresh();
  }, []);

  const analyze = async () => {
    const target = normalizeUrl(url);
    if (!target) {
      toast.error("분석할 웹사이트 URL 을 입력하세요.");
      return;
    }
    setProgress("scraping");
    try {
      const draft = await analyzeBrand(target, setProgress);
      setProgress("done");
      const brand = await createBrand(draft);
      toast.success(`"${brand.name}" 브랜드 킷을 만들었습니다.`);
      navigate(`/brand/${brand.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "브랜드 분석에 실패했습니다.");
    } finally {
      setProgress(null);
    }
  };

  const makeDemo = async () => {
    setDemoBusy(true);
    try {
      const { brand } = await createDemoWorkspace();
      toast.success("데모 브랜드와 캠페인을 만들었습니다.");
      navigate(`/brand/${brand.id}`);
    } catch {
      toast.error("데모 생성에 실패했습니다. PB 컬렉션 셋업을 확인하세요.");
    } finally {
      setDemoBusy(false);
    }
  };

  const remove = async (brand: BrandKit) => {
    try {
      await deleteBrand(brand.id);
      toast.success(`"${brand.name}" 을 삭제했습니다.`);
      void refresh();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-16 sm:pt-24">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_460px]">
        <div>
          <header className="ms-reveal">
            <p className="ms-mono text-primary">URL → BRAND DNA → CAMPAIGN → CREATIVE</p>
            <h1 className="ms-hero mt-5">
              웹사이트 하나면,
              <br />
              캠페인이 <span className="text-primary">시작</span>됩니다
            </h1>
            <p className="mt-5 max-w-md break-keep text-[15px] leading-relaxed text-muted-foreground">
              {APP_TAGLINE}
            </p>
          </header>

          <div className="ms-reveal ms-reveal-2 mt-10 max-w-xl">
            <div className="ms-hero-pill">
              <input
                className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60"
                placeholder="brand.example.com"
                value={url}
                disabled={progress !== null}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void analyze();
                }}
              />
              <button
                type="button"
                className="ms-cta shrink-0"
                disabled={progress !== null}
                onClick={() => void analyze()}
              >
                {progress !== null ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {PROGRESS_LABEL[progress]}
                  </>
                ) : (
                  <>
                    브랜드 분석
                    <ArrowRight className="ms-cta-arrow size-4" />
                  </>
                )}
              </button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              사이트를 수집해 톤·메시지·팔레트·로고·이미지를 추출합니다. 결과물이 먼저 궁금하다면{" "}
              <button
                type="button"
                className="ms-linkact"
                disabled={demoBusy}
                onClick={() => void makeDemo()}
              >
                {demoBusy ? "데모 생성 중…" : "데모 브랜드로 시작"}
              </button>
            </p>
          </div>
        </div>

        {/* 히어로 콜라주 — 엔진이 직접 렌더한 도판을 교정지처럼 흩어놓는다 */}
        <div className="ms-reveal ms-reveal-3 relative hidden h-[500px] select-none lg:block" aria-hidden>
          {/* 메인 도판 — 그라디언트 구도의 카피(좌하단)가 가려지지 않게 좌측 배치 */}
          <div className="ms-plate absolute left-0 top-5 w-[300px] rotate-[-2deg]">
            <CreativeCanvas
              brand={HERO_BRAND}
              platformId={HERO_PLATES[0].platformId}
              copy={HERO_PLATES[0].copy}
              style={HERO_PLATES[0].style}
              className="overflow-hidden rounded-[4px]"
            />
          </div>
          {/* 서브 도판들은 메인의 빈 공간(우상단 글로우) 쪽으로 겹친다 */}
          <div className="ms-plate absolute right-0 top-0 z-10 w-[205px] rotate-[4deg]">
            <CreativeCanvas
              brand={HERO_BRAND}
              platformId={HERO_PLATES[1].platformId}
              copy={HERO_PLATES[1].copy}
              style={HERO_PLATES[1].style}
              className="overflow-hidden rounded-[4px]"
            />
          </div>
          <div className="ms-plate absolute bottom-6 right-2 z-20 w-[265px] rotate-[1.5deg]">
            <CreativeCanvas
              brand={HERO_BRAND}
              platformId={HERO_PLATES[2].platformId}
              copy={HERO_PLATES[2].copy}
              style={HERO_PLATES[2].style}
              className="overflow-hidden rounded-[4px]"
            />
          </div>
          <p className="ms-mono absolute bottom-0 right-4 text-muted-foreground/70">
            PL.01–03 · 온새미로 티하우스 — PREVIEW
          </p>
        </div>
      </div>

      <section className="ms-reveal ms-reveal-3 mt-20">
        <div className="ms-rule">
          <span className="ms-rule-no">A</span>
          <span className="ms-rule-label">내 브랜드</span>
          <span className="ms-rule-meta">{brands.length > 0 ? `${brands.length}` : ""}</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : brands.length === 0 ? (
          <p className="mt-6 py-12 text-center text-sm text-muted-foreground">
            아직 브랜드가 없습니다 — URL 을 분석하거나 데모로 시작해보세요.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <div key={brand.id} className="ms-sheet ms-lift group relative overflow-hidden">
                <Link to={`/brand/${brand.id}`} className="block p-6">
                  <div
                    className="h-1.5 w-14 rounded-full"
                    style={{ background: brandGradient(brand) }}
                  />
                  <div className="mt-5 flex items-center justify-between gap-2">
                    <p className="ms-display truncate text-xl">{brand.name || brand.url}</p>
                    <ArrowRight className="size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-1.5 truncate break-keep text-xs text-muted-foreground">
                    {brand.tagline || brand.url}
                  </p>
                  <div className="mt-5 flex items-center gap-1.5">
                    {[...brand.primaryColors, ...brand.secondaryColors]
                      .map((c) => normalizeHex(c))
                      .filter((c): c is string => Boolean(c))
                      .slice(0, 6)
                      .map((color, index) => (
                        <span
                          key={`${color}-${index}`}
                          className="size-4 rounded-full"
                          style={{ background: color, boxShadow: "inset 0 0 0 1px rgba(25,24,19,0.12)" }}
                        />
                      ))}
                    <span className="ms-mono ml-auto text-muted-foreground">{brand.industry}</span>
                  </div>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      aria-label="브랜드 삭제"
                      className="absolute right-3 top-3 hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive group-hover:block"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>브랜드를 삭제할까요?</AlertDialogTitle>
                      <AlertDialogDescription>
                        “{brand.name}” 의 캠페인과 에셋이 함께 삭제됩니다. 되돌릴 수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void remove(brand)}>
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
