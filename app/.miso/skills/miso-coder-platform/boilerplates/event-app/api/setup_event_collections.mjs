#!/usr/bin/env node

const runtimeId = process.env.RUNTIME_APP_ID || process.env.RUNTIME_CODEBASE_ID;
const internalUrl = process.env.SM_INTERNAL_URL;

if (!runtimeId || !internalUrl) {
  console.error("Missing RUNTIME_APP_ID/RUNTIME_CODEBASE_ID or SM_INTERNAL_URL.");
  process.exit(1);
}

const endpoint = `${internalUrl.replace(/\/$/, "")}/internal/coder/runtime/${runtimeId}/data/api/collections`;
const eventCode = process.env.EVENT_CODE || "miso-live-2026";

const dateFields = [
  { name: "created", type: "autodate", onCreate: true, onUpdate: false },
  { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
];

const publicRules = {
  listRule: "",
  viewRule: "",
  createRule: "",
  updateRule: "",
  deleteRule: "",
};

const collections = [
  {
    name: "participants",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "affiliation", type: "text" },
      { name: "email", type: "text" },
      { name: "phone", type: "text" },
      { name: "agreed", type: "bool" },
      { name: "checkedIn", type: "bool" },
      { name: "checkedInAt", type: "date" },
      { name: "eventCode", type: "text", required: true },
      { name: "joinCode", type: "text" },
      ...dateFields,
    ],
  },
  {
    name: "questions",
    fields: [
      { name: "authorName", type: "text", required: true },
      { name: "content", type: "text", required: true, max: 300 },
      { name: "likes", type: "number" },
      { name: "answered", type: "bool" },
      { name: "hidden", type: "bool" },
      { name: "pinned", type: "bool" },
      { name: "sessionId", type: "text" },
      { name: "eventCode", type: "text", required: true },
      ...dateFields,
    ],
  },
  {
    name: "quiz_sessions",
    fields: [
      { name: "eventCode", type: "text", required: true },
      { name: "title", type: "text", required: true },
      { name: "status", type: "text", required: true },
      { name: "currentQuestionId", type: "text" },
      { name: "currentQuestionIndex", type: "number" },
      { name: "questionStartedAt", type: "date" },
      { name: "questionLockedAt", type: "date" },
      { name: "showLeaderboard", type: "bool" },
      { name: "updatedBy", type: "text" },
      ...dateFields,
    ],
  },
  {
    name: "quiz_questions",
    fields: [
      { name: "quizSessionId", type: "text", required: true },
      { name: "order", type: "number", required: true },
      { name: "prompt", type: "text", required: true },
      { name: "choices", type: "json", required: true },
      { name: "correctChoiceId", type: "text", required: true },
      { name: "timeLimitSec", type: "number" },
      { name: "basePoints", type: "number" },
      { name: "speedBonusPoints", type: "number" },
      { name: "explanation", type: "text" },
      ...dateFields,
    ],
  },
  {
    name: "quiz_players",
    fields: [
      { name: "quizSessionId", type: "text", required: true },
      { name: "participantId", type: "text", required: true },
      { name: "displayName", type: "text", required: true },
      { name: "score", type: "number" },
      { name: "rank", type: "number" },
      { name: "correctCount", type: "number" },
      { name: "totalResponseMs", type: "number" },
      { name: "answeredCount", type: "number" },
      { name: "lastAnsweredAt", type: "date" },
      ...dateFields,
    ],
  },
  {
    name: "quiz_answers",
    fields: [
      { name: "quizSessionId", type: "text", required: true },
      { name: "questionId", type: "text", required: true },
      { name: "participantId", type: "text", required: true },
      { name: "choiceId", type: "text", required: true },
      { name: "isCorrect", type: "bool" },
      { name: "answeredAt", type: "date" },
      { name: "responseMs", type: "number" },
      { name: "points", type: "number" },
      ...dateFields,
    ],
  },
  {
    name: "draw_prizes",
    fields: [
      { name: "eventCode", type: "text", required: true },
      { name: "name", type: "text", required: true },
      { name: "description", type: "text" },
      { name: "quantity", type: "number" },
      { name: "image", type: "file" },
      { name: "order", type: "number" },
      ...dateFields,
    ],
  },
  {
    name: "draw_winners",
    fields: [
      { name: "eventCode", type: "text", required: true },
      { name: "prizeId", type: "text", required: true },
      { name: "participantId", type: "text", required: true },
      { name: "participantName", type: "text", required: true },
      { name: "drawnAt", type: "date" },
      { name: "voided", type: "bool" },
      ...dateFields,
    ],
  },
];

const quizQuestions = [
  {
    order: 1,
    prompt: "MISO Coder 이벤트 앱 보일러플레이트의 기본 프런트엔드 런타임은 무엇인가요?",
    choices: [
      { id: "a", label: "Next.js App Router" },
      { id: "b", label: "Vite + React" },
      { id: "c", label: "Vue + Nuxt" },
      { id: "d", label: "SvelteKit" },
    ],
    correctChoiceId: "b",
    timeLimitSec: 20,
    basePoints: 1000,
    speedBonusPoints: 500,
    explanation: "MISO Coder website app 보일러플레이트는 Vite + React overlay입니다.",
  },
  {
    order: 2,
    prompt: "라이브 퀴즈에서 빠른 정답자에게 추가 점수를 주는 이유는 무엇인가요?",
    choices: [
      { id: "a", label: "동점자를 줄이고 몰입도를 높이기 위해" },
      { id: "b", label: "네트워크 지연을 늘리기 위해" },
      { id: "c", label: "오답자에게 보너스를 주기 위해" },
      { id: "d", label: "진행자 화면을 숨기기 위해" },
    ],
    correctChoiceId: "a",
    timeLimitSec: 20,
    basePoints: 1000,
    speedBonusPoints: 500,
    explanation: "정답과 응답 속도를 함께 반영하면 행사 현장의 경쟁감과 몰입도가 살아납니다.",
  },
  {
    order: 3,
    prompt: "경품추첨 후보에 포함되는 참가자는?",
    choices: [
      { id: "a", label: "사전 신청자 전체" },
      { id: "b", label: "체크인 완료 참가자" },
      { id: "c", label: "Q&A를 작성한 사람만" },
      { id: "d", label: "운영자 계정만" },
    ],
    correctChoiceId: "b",
    timeLimitSec: 15,
    basePoints: 1000,
    speedBonusPoints: 500,
    explanation: "현장 행사 경품추첨은 체크인 완료자를 기본 후보로 봅니다.",
  },
];

const participants = [
  {
    name: "Ally",
    affiliation: "MISO",
    email: "ally@example.com",
    phone: "010-0000-0001",
    agreed: true,
    checkedIn: true,
  },
  {
    name: "Young",
    affiliation: "기획자 · MISO PO",
    email: "young@example.com",
    phone: "010-0000-0002",
    agreed: true,
    checkedIn: true,
  },
  {
    name: "Eugene",
    affiliation: "FE 개발",
    email: "eugene@example.com",
    phone: "010-0000-0003",
    agreed: true,
    checkedIn: true,
  },
  {
    name: "Kade",
    affiliation: "BE 개발",
    email: "kade@example.com",
    phone: "010-0000-0004",
    agreed: true,
    checkedIn: true,
  },
  {
    name: "Han",
    affiliation: "SRE",
    email: "han@example.com",
    phone: "010-0000-0005",
    agreed: true,
    checkedIn: true,
  },
  {
    name: "Heather",
    affiliation: "UI/UX",
    email: "heather@example.com",
    phone: "010-0000-0006",
    agreed: true,
    checkedIn: false,
  },
];

const drawPrizes = [
  {
    name: "MISO 굿즈 패키지",
    description: "체크인 완료 참가자 대상 메인 경품",
    quantity: 1,
    order: 1,
  },
  {
    name: "커피 쿠폰",
    description: "세션 중간 추첨용 소형 경품",
    quantity: 5,
    order: 2,
  },
];

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${body}`);
  }
  return response.json();
}

function recordsEndpoint(collectionName) {
  return `${endpoint}/${collectionName}/records`;
}

async function listRecords(collectionName, filter) {
  const url = new URL(recordsEndpoint(collectionName));
  url.searchParams.set("perPage", "200");
  if (filter) url.searchParams.set("filter", filter);
  const result = await request(url.toString());
  return Array.isArray(result?.items) ? result.items : [];
}

async function createRecord(collectionName, data) {
  return request(recordsEndpoint(collectionName), {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function updateRecord(collectionName, id, data) {
  return request(`${recordsEndpoint(collectionName)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

function collectionPayload(definition) {
  return {
    name: definition.name,
    type: "base",
    ...publicRules,
    fields: definition.fields,
  };
}

async function main() {
  const existingResponse = await request(endpoint);
  const existingItems = Array.isArray(existingResponse?.items)
    ? existingResponse.items
    : Array.isArray(existingResponse)
      ? existingResponse
      : [];

  for (const definition of collections) {
    const existing = existingItems.find((item) => item.name === definition.name);
    const payload = collectionPayload(definition);
    if (existing) {
      await request(`${endpoint}/${existing.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      console.log(`updated ${definition.name}`);
    } else {
      await request(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      console.log(`created ${definition.name}`);
    }
  }

  const existingParticipants = await listRecords("participants", `eventCode="${eventCode}"`);
  if (existingParticipants.length === 0) {
    for (const participant of participants) {
      await createRecord("participants", {
        ...participant,
        eventCode,
        joinCode: eventCode,
        checkedInAt: participant.checkedIn ? new Date().toISOString() : undefined,
      });
    }
    console.log("seeded participants");
  }

  const quizSessions = await listRecords("quiz_sessions", `eventCode="${eventCode}"`);
  let quizSession = quizSessions[0];
  if (!quizSession) {
    quizSession = await createRecord("quiz_sessions", {
      eventCode,
      title: "MISO Coder 라이브 퀴즈",
      status: "lobby",
      currentQuestionIndex: 0,
      showLeaderboard: false,
    });
    console.log("seeded quiz_sessions");
  }

  const existingQuestions = await listRecords("quiz_questions", `quizSessionId="${quizSession.id}"`);
  if (existingQuestions.length === 0) {
    let firstQuestion = null;
    for (const question of quizQuestions) {
      const createdQuestion = await createRecord("quiz_questions", {
        ...question,
        quizSessionId: quizSession.id,
      });
      if (!firstQuestion) firstQuestion = createdQuestion;
    }
    if (firstQuestion) {
      await updateRecord("quiz_sessions", quizSession.id, {
        currentQuestionId: firstQuestion.id,
        currentQuestionIndex: 0,
      });
    }
    console.log("seeded quiz_questions");
  }

  const existingPrizes = await listRecords("draw_prizes", `eventCode="${eventCode}"`);
  if (existingPrizes.length === 0) {
    for (const prize of drawPrizes) {
      await createRecord("draw_prizes", {
        ...prize,
        eventCode,
      });
    }
    console.log("seeded draw_prizes");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
