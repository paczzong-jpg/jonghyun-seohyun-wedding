import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CreativeCanvas } from "@/components/marketing/creative-canvas";
import { EditorControls } from "@/components/marketing/editor-controls";
import { generateCopy } from "@/lib/marketing/copy-generator";
import { assetFileName, exportNodeToPng } from "@/lib/marketing/export-png";
import { getPlatform } from "@/lib/marketing/platforms";
import { deleteAsset, getAsset, getBrand, getCampaign, updateAsset } from "@/lib/marketing/store";
import type { AssetCopy, BrandKit, CreativeStyle, MarketingAsset } from "@/lib/marketing/types";

// 에셋 에디터 — 좌측 실시간 캔버스, 우측 컨트롤. 변경은 디바운스 자동 저장.

const AUTOSAVE_MS = 800;

export function AssetEditorPage() {
  const { assetId = "" } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<MarketingAsset | null>(null);
  const [brand, setBrand] = useState<BrandKit | null>(null);
  const [conceptTitle, setConceptTitle] = useState("");
  const [busy, setBusy] = useState<"regen" | "download" | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const exportNodeRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getAsset(assetId)
      .then(async (loaded) => {
        setAsset(loaded);
        const [loadedBrand, campaign] = await Promise.all([
          getBrand(loaded.brandId),
          getCampaign(loaded.campaignId),
        ]);
        setBrand(loadedBrand);
        setConceptTitle(campaign.concepts[loaded.conceptIndex]?.title ?? "");
      })
      .catch(() => {
        toast.error("에셋을 불러오지 못했습니다.");
        navigate("/");
      });
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [assetId, navigate]);

  const applyPatch = (patch: Partial<AssetCopy> & { style?: CreativeStyle }) => {
    setAsset((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      setSaveState("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        setSaveState("saving");
        updateAsset(next.id, {
          headline: next.headline,
          body: next.body,
          cta: next.cta,
          style: next.style,
        })
          .then(() => setSaveState("saved"))
          .catch(() => {
            setSaveState("dirty");
            toast.error("자동 저장에 실패했습니다.");
          });
      }, AUTOSAVE_MS);
      return next;
    });
  };

  if (!asset || !brand) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const platform = getPlatform(asset.platformId);

  const regenerateCopy = async () => {
    setBusy("regen");
    try {
      const campaign = await getCampaign(asset.campaignId);
      const concept = campaign.concepts[asset.conceptIndex];
      if (!concept) throw new Error("컨셉 정보를 찾을 수 없습니다.");
      const copy = await generateCopy(brand, concept, asset.platformId);
      applyPatch(copy);
      toast.success("새 카피를 적용했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "카피 재생성에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    const node = exportNodeRef.current;
    if (!node) return;
    setBusy("download");
    try {
      await exportNodeToPng(node, {
        width: platform.width,
        height: platform.height,
        fileName: assetFileName(brand.name, platform.id),
      });
    } catch {
      toast.error("PNG 내보내기에 실패했습니다. 외부 이미지 로드를 확인하세요.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    try {
      await deleteAsset(asset.id);
      toast.success("에셋을 삭제했습니다.");
      navigate(`/campaign/${asset.campaignId}`);
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const saveLabel =
    saveState === "saved" ? "저장됨" : saveState === "saving" ? "저장 중…" : "변경됨";

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-5 py-12">
      <header className="ms-reveal mb-8 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <Link
            to={`/campaign/${asset.campaignId}`}
            className="ms-mono inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> {brand.name}
            {conceptTitle ? ` · ${conceptTitle}` : ""}
          </Link>
          <h1 className="ms-display mt-2 truncate text-3xl">{platform.label}</h1>
        </div>
        <span className="ms-mono shrink-0 text-muted-foreground">{saveLabel}</span>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="ms-reveal ms-reveal-1 lg:col-span-2">
          {/* 잉크 룸 — 화면의 대비 모먼트, 캔버스가 교정지처럼 떠 있다 */}
          <div className="ms-stage p-6 md:p-10">
            {/* 세로형 포맷이 화면을 넘지 않도록 높이 70vh 기준으로 폭을 역산 */}
            <div
              className="mx-auto"
              style={{
                maxWidth: `min(100%, calc(70vh * ${platform.width / platform.height}))`,
              }}
            >
              <CreativeCanvas
                ref={exportNodeRef}
                brand={brand}
                platformId={asset.platformId}
                copy={asset}
                style={asset.style}
                className="overflow-hidden rounded-md shadow-2xl"
              />
            </div>
            <p className="ms-mono mt-5 text-center" style={{ color: "rgba(243,241,232,0.45)" }}>
              {platform.width} × {platform.height} PX
            </p>
          </div>
        </div>
        <div className="ms-reveal ms-reveal-2">
          <EditorControls
            brand={brand}
            platformId={asset.platformId}
            copy={asset}
            style={asset.style}
            busy={busy}
            onCopyChange={(patch) => applyPatch(patch)}
            onStyleChange={(patch) => applyPatch({ style: { ...asset.style, ...patch } })}
            onRegenerateCopy={() => void regenerateCopy()}
            onDownload={() => void download()}
            onDelete={() => void remove()}
          />
        </div>
      </div>
    </div>
  );
}
