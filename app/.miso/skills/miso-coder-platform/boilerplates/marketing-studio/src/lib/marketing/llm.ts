import {
  getMisoLLMConfig,
  invokeMisoLLM,
  type DirectLlmContentPart,
  type DirectLlmTargetModel,
} from "@/lib/miso-sdk/miso-llm";

// MISO Direct LLM 얇은 래퍼 — 모델 설정 캐시 + STRICT JSON 응답 파싱.

let cachedModel: DirectLlmTargetModel | null = null;

export async function ensureTargetModel(): Promise<DirectLlmTargetModel> {
  if (cachedModel) return cachedModel;
  let config;
  try {
    config = await getMisoLLMConfig();
  } catch {
    // 코더 런타임 밖(프록시 부재)에서는 HTML 폴백 등이 내려와 raw 파싱 에러가 노출된다
    throw new Error(
      "MISO LLM 에 연결할 수 없습니다. 코더 미리보기/발행 환경에서 실행 중인지 확인하세요.",
    );
  }
  const first = config.selected_models[0];
  if (!first) {
    throw new Error(
      "사용 가능한 MISO 모델이 없습니다. 워크스페이스에서 모델을 선택한 뒤 다시 시도하세요.",
    );
  }
  cachedModel = {
    registeredProviderId: first.registered_provider_id,
    modelId: first.model_id,
  };
  return cachedModel;
}

// 코드펜스·서문이 섞여 와도 첫 JSON 값을 찾아 파싱한다.
export function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const objMatch = candidate.match(/[[{][\s\S]*[\]}]/);
  if (!objMatch) {
    throw new Error(`LLM 응답에서 JSON 을 찾지 못했습니다: ${raw.slice(0, 200)}`);
  }
  return JSON.parse(objMatch[0]) as T;
}

export type ImageInput = { mime: string; base64: string };

export async function completeJson<T>(options: {
  prompt: string;
  temperature: number;
  image?: ImageInput | null;
  imageNote?: string;
}): Promise<T> {
  const targetModel = await ensureTargetModel();

  const content: string | DirectLlmContentPart[] = options.image
    ? [
        { type: "text", text: options.prompt },
        ...(options.imageNote
          ? [{ type: "text", text: options.imageNote } as DirectLlmContentPart]
          : []),
        {
          type: "image",
          mimeType: options.image.mime,
          base64Data: options.image.base64,
          detail: "low",
        },
      ]
    : options.prompt;

  const response = await invokeMisoLLM({
    messages: [{ role: "user", content }],
    targetModel,
    modelParameters: { temperature: options.temperature },
  });

  return extractJson<T>(response.answer);
}

export const asString = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v.trim() : fallback;

export const asStringArray = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
    : [];
