import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrandKitForm } from "@/components/marketing/brand-kit-form";
import { CreativeCanvas } from "@/components/marketing/creative-canvas";
import {
  generateConcepts,
  generateSuggestions,
  type CampaignSuggestion,
} from "@/lib/marketing/campaign-generator";
import { CAMPAIGN_GOALS } from "@/lib/marketing/config";
import { createCampaign, getBrand, listCampaigns, updateBrand } from "@/lib/marketing/store";
import type { BrandKit, Campaign, CampaignGoalId } from "@/lib/marketing/types";

// 브랜드 상세 — DNA 벤토 보드(좌) + 라이브 미리보기·캠페인 컴포저(우)

export function BrandPage() {
  const { brandId = "" } = useParams();
  const navigate = useNavigate();
  const [brand, setBrand] = useState<BrandKit | null>(null);
  const [draft, setDraft] = useState<BrandKit | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState<CampaignGoalId>("brand_awareness");
  const [direction, setDirection] = useState("");
  const [creating, setCreating] = useState(false);
  // null = 로딩 중, [] = 제안 없음(LLM 불가 포함 — 조용히 숨김)
  const [suggestions, setSuggestions] = useState<CampaignSuggestion[] | null>(null);

  useEffect(() => {
    Promise.all([getBrand(brandId), listCampaigns(brandId)])
      .then(([loadedBrand, loadedCampaigns]) => {
        setBrand(loadedBrand);
        setDraft(loadedBrand);
        setCampaigns(loadedCampaigns);
        generateSuggestions(loadedBrand)
          .then(setSuggestions)
          .catch(() => setSuggestions([]));
      })
      .catch(() => {
        toast.error("브랜드를 불러오지 못했습니다.");
        navigate("/");
      });
  }, [brandId, navigate]);

  const dirty = useMemo(
    () => JSON.stringify(brand) !== JSON.stringify(draft),
    [brand, draft],
  );

  if (!brand || !draft) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      const { id: _id, created: _created, updated: _updated, ...patch } = draft;
      const next = await updateBrand(brand.id, patch);
      setBrand(next);
      setDraft(next);
      toast.success("브랜드 DNA 를 저장했습니다.");
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const createNewCampaign = async (goalArg: CampaignGoalId, directionArg: string) => {
    if (dirty) {
      toast.error("먼저 브랜드 DNA 변경사항을 저장하세요.");
      return;
    }
    setCreating(true);
    try {
      const concepts = await generateConcepts(brand, goalArg, directionArg.trim());
      const campaign = await createCampaign({
        brandId: brand.id,
        goal: goalArg,
        direction: directionArg.trim(),
        concepts,
      });
      toast.success("캠페인 컨셉 4개를 만들었습니다.");
      navigate(`/campaign/${campaign.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "캠페인 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-12">
      <header className="ms-reveal mb-10 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            to="/"
            className="ms-mono inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> HOME
          </Link>
          <h1 className="ms-display mt-2 truncate text-4xl">{brand.name}</h1>
          <p className="ms-mono mt-1.5 truncate text-muted-foreground">{brand.url}</p>
        </div>
        <button
          type="button"
          className="ms-cta shrink-0"
          style={{ padding: "0.6rem 1.3rem", fontSize: 13 }}
          disabled={!dirty || saving}
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {dirty ? "저장" : "저장됨"}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
        <section className="ms-reveal ms-reveal-1 lg:col-span-3">
          <div className="ms-rule">
            <span className="ms-rule-no">01</span>
            <span className="ms-rule-label">브랜드 DNA</span>
            <span className="ms-rule-meta">모든 크리에이티브가 이 값을 따릅니다</span>
          </div>
          <div className="mt-5">
            <BrandKitForm
              value={draft}
              onChange={(patch) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev))}
            />
          </div>
        </section>

        <div className="space-y-10 lg:col-span-2">
          <section className="ms-reveal ms-reveal-2">
            <div className="ms-rule">
              <span className="ms-rule-no">02</span>
              <span className="ms-rule-label">라이브 미리보기</span>
              <span className="ms-rule-meta">편집 즉시 반영</span>
            </div>
            <div className="ms-sheet mt-5 overflow-hidden p-3">
              <CreativeCanvas
                brand={draft}
                platformId="instagram_feed"
                copy={{
                  headline: draft.tagline || draft.name || "브랜드 태그라인",
                  body: draft.keyMessages[0] ?? "",
                  cta: "자세히 보기",
                }}
                style={{
                  archetype: "gradient",
                  paletteIndex: 0,
                  showLogo: true,
                  bgImageUrl: "",
                  textScale: 1,
                }}
                className="overflow-hidden rounded-md"
              />
            </div>
          </section>

          <section className="ms-reveal ms-reveal-3">
            <div className="ms-rule">
              <span className="ms-rule-no">03</span>
              <span className="ms-rule-label">새 캠페인</span>
            </div>
            <div className="ms-sheet mt-5 p-6">
              <textarea
                rows={3}
                className="ms-uline resize-none break-keep text-[15px] font-medium leading-relaxed"
                placeholder="어떤 캠페인을 만들까요? 예: 여름 시즌 신메뉴를 2030에게 알리고 싶어요"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              />
              <p className="ms-mono mb-2 mt-5 text-muted-foreground">GOAL — 선택</p>
              <div className="flex flex-wrap gap-1.5">
                {CAMPAIGN_GOALS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    title={option.description}
                    aria-pressed={goal === option.id}
                    onClick={() => setGoal(option.id)}
                    className="ms-pill"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="ms-cta mt-6 w-full"
                disabled={creating}
                onClick={() => void createNewCampaign(goal, direction)}
              >
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    컨셉 만드는 중…
                  </>
                ) : (
                  <>
                    캠페인 컨셉 4개 생성
                    <ArrowRight className="ms-cta-arrow size-4" />
                  </>
                )}
              </button>

              {suggestions === null || suggestions.length > 0 ? (
                <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--ms-hairline)" }}>
                  <p className="ms-mono mb-1 text-muted-foreground">SUGGESTIONS — DNA 기반 제안</p>
                  {suggestions === null ? (
                    <div className="space-y-2 pt-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                      ))}
                    </div>
                  ) : (
                    <ul>
                      {suggestions.map((item, index) => (
                        <li
                          key={index}
                          className="border-b last:border-b-0"
                          style={{ borderColor: "var(--ms-hairline)" }}
                        >
                          <button
                            type="button"
                            disabled={creating}
                            onClick={() => {
                              setGoal(item.goal);
                              setDirection(item.direction);
                              void createNewCampaign(item.goal, item.direction);
                            }}
                            className="group flex w-full items-baseline gap-3 py-3 text-left"
                          >
                            <span className="ms-num text-sm text-primary">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold group-hover:text-primary">
                                {item.title}
                              </span>
                              <span className="mt-0.5 line-clamp-2 break-keep text-xs leading-relaxed text-muted-foreground">
                                {item.direction}
                              </span>
                            </span>
                            <span className="ms-mono shrink-0 text-muted-foreground">
                              {CAMPAIGN_GOALS.find((g) => g.id === item.goal)?.label ?? item.goal}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </section>

          <section className="ms-reveal ms-reveal-4">
            <div className="ms-rule">
              <span className="ms-rule-no">04</span>
              <span className="ms-rule-label">캠페인</span>
              <span className="ms-rule-meta">{campaigns.length > 0 ? `${campaigns.length}` : ""}</span>
            </div>
            {campaigns.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">아직 캠페인이 없습니다.</p>
            ) : (
              <ul className="mt-3">
                {campaigns.map((campaign) => {
                  const goalLabel =
                    CAMPAIGN_GOALS.find((g) => g.id === campaign.goal)?.label ?? campaign.goal;
                  return (
                    <li
                      key={campaign.id}
                      className="border-b"
                      style={{ borderColor: "var(--ms-hairline)" }}
                    >
                      <Link
                        to={`/campaign/${campaign.id}`}
                        className="group flex items-center justify-between gap-3 py-3.5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold group-hover:text-primary">
                            {goalLabel}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {campaign.direction || `컨셉 ${campaign.concepts.length}개`}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
