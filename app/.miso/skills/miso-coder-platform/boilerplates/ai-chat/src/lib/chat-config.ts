import type { ChatCommand, ChatEndpoint } from "@/lib/chat-types"

export const SYSTEM_PROMPT =
  "당신은 MISO 팀을 지원하는 업무용 AI 어시스턴트입니다. 답변은 정확하고 간결하게 작성하고, 모르는 내용은 추측하지 않습니다."

export const ARTIFACT_SYSTEM_PROMPT = [
  SYSTEM_PROMPT,
  "When the user asks for a durable document, canvas, code artifact, sheet, image prompt, artifact edit, rewrite, or suggestions, use the provided Direct LLM tools instead of writing pseudo-tool JSON in markdown.",
  "Use createArtifact for new durable outputs, editArtifact for precise oldString/newString changes, updateArtifact for full rewrites, and requestSuggestions for review or improvement suggestions.",
  "Never call tools for secrets, credentials, external private APIs, or privileged workspace actions.",
  "Allowed artifact kinds are text, code, sheet, and image. Text should default to markdown, code to a concrete source language, sheet to CSV or markdown-table content, and image to a prompt plus accessible alt text.",
  "When creating an artifact, pass title, kind, and instruction so the browser can stream the artifact body into canvas. Only pass content when the user supplied exact text that must be preserved verbatim.",
].join("\n")

export const CHAT_CONFIG = {
  title: "MISO Chat Service",
  subtitle: "Workspace chat",
  placeholder: "메시지 또는 /canvas, /code, /sheet 명령을 입력하세요",
  welcomeTitle: "무엇을 도와드릴까요?",
  welcomeMessage: "Direct LLM, 파일, canvas artifact, 피드백을 한 대화에서 사용할 수 있습니다.",
} as const

export const CHAT_COMMANDS: ChatCommand[] = [
  { id: "new", label: "/new", hint: "새 대화를 시작" },
  { id: "clear", label: "/clear", hint: "현재 대화를 보관하고 새 대화를 시작" },
  { id: "canvas", label: "/canvas", hint: "답변을 canvas artifact로 저장", artifactKind: "text" },
  { id: "text", label: "/text", hint: "문서 artifact 작성", artifactKind: "text" },
  { id: "code", label: "/code", hint: "코드 artifact 작성", artifactKind: "code" },
  { id: "sheet", label: "/sheet", hint: "표 artifact 작성", artifactKind: "sheet" },
  { id: "image", label: "/image", hint: "이미지 프롬프트 artifact 작성", artifactKind: "image" },
  { id: "suggest", label: "/suggest", hint: "열린 artifact 개선안 요청" },
]

export const SUGGESTED_ACTIONS = [
  "이번 대화 내용을 실행 계획으로 정리해줘",
  "/canvas 고객 응대 정책 초안을 만들어줘",
  "/code React 컴포넌트 예시를 만들어줘",
  "/sheet 기능별 우선순위 표를 만들어줘",
] as const

export const CHAT_ENDPOINTS: ChatEndpoint[] = [
  {
    id: "direct-llm",
    kind: "direct-llm",
    label: "Direct LLM",
    description: "Managed model",
    supportsFiles: true,
    supportsWorkflowEvents: false,
  },
  {
    id: "advanced-chat",
    kind: "advanced-chat",
    label: "Advanced Chat",
    description: "Chatflow app",
    appId: import.meta.env.VITE_MISO_CHATFLOW_APP_ID || "",
    supportsFiles: true,
    supportsWorkflowEvents: true,
  },
  {
    id: "agent",
    kind: "agent",
    label: "Agent",
    description: "Agent app",
    appId: import.meta.env.VITE_MISO_AGENT_APP_ID || "",
    supportsFiles: true,
    supportsWorkflowEvents: false,
  },
]

export const DEFAULT_ENDPOINT_ID = "direct-llm"

export const TEAM_MEMBERS = [
  { name: "Ally", role: "member", title: "Operations" },
  { name: "Young", role: "owner", title: "기획자, MISO PO" },
  { name: "Eugene", role: "member", title: "FE 개발" },
  { name: "Kade", role: "member", title: "BE 개발" },
  { name: "Han", role: "member", title: "SRE" },
  { name: "Heather", role: "member", title: "UI/UX" },
] as const
