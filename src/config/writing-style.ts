import { prisma } from "@/lib/prisma";

/* ───── Default Writing Rules (코드 기본값) ───── */

/** 공통 문체 — signal/commits 모두 적용 */
const DEFAULT_TONE = `- "~다" 체. 친구한테 설명하듯이 자연스럽게.
- 첫 문장에 핵심. 도입부 없이 바로 들어간다.
- 솔직하게. 삽질, 실수, 모르는 것을 숨기지 않는다.`;

/** 공통 금지사항 */
const DEFAULT_PROHIBITIONS = `- "~하겠습니다", "~인 것 같습니다" 같은 존댓말
- "이 글에서는 ~에 대해 알아보겠습니다" 같은 교과서 도입부
- "정리하자면", "요약하면" 같은 상투적 결론
- 이모지 남용
- 단순 번역이나 복붙`;

/** 공통 작성자 페르소나 */
const DEFAULT_PERSONA = `당신은 "이더"라는 개발자의 기술 블로그 글 작성자입니다.
이더는 UE5 C++ 게임 프로그래머이자 AI 사이드프로젝트 빌더다.
게임 개발자 시각(서버 아키텍처, 성능 최적화 감각)이 자연스럽게 드러나야 한다.`;

/** 공통 마무리 규칙 */
const DEFAULT_CLOSING = `- 마지막은 > 인용구(blockquote) 형태의 한줄 정리로 마무리`;

/* ───── Category-Specific Rules ───── */

/** Signal (AI 뉴스) 전용 구조 규칙 */
const SIGNAL_STRUCTURE = `- 제목은 "AI 업데이트: {핵심 키워드}" 형식
- 본문은 ## 섹션으로 구분 (예: 🔥 핫 토픽, 📰 뉴스, 📄 논문, ⭐ 오픈소스 등)
- 섹션마다 뉴스 제목 + 원문 링크 + 2~3문장 해설
- 각 항목 말미에 **출처:** [소스명](원문URL) 형태로 출처를 반드시 명시
- 소스가 다양하면 섹션을 소스 유형별로 묶어도 좋다
- 전체 2000~4000자`;

const SIGNAL_FOCUS = `- 뉴스 나열이 아니라, 개발자 관점에서 해석과 코멘트를 곁들인다.
- 각 뉴스에 대해 "이게 왜 중요한지" 한줄 코멘트를 추가한다.`;

/** Commits (긴 글) 전용 구조 규칙 */
const COMMITS_STRUCTURE = `- 고정 구조 없이 내용에 맞게 유연하게
- ## 섹션 최소 4개, 각 섹션은 3~5개 문단 + 코드 블록 1개 이상
- 편당 5000~8000자 (한국어 기준)
- 문단은 3~4줄 이내, 문단 사이 빈 줄
- 코드 블록 앞뒤 빈 줄, 언어 명시`;

const COMMITS_FOCUS = `- Before/After 코드 대비 (변경이 있을 때)
- 구체적 숫자 ($0.008, 120ms → 3ms, 15배 차이 등)
- "왜 이렇게 했는지" + "다른 방법은 왜 안 됐는지"
- 삽질 포인트 ("여기서 3시간 날렸다")
- 커밋 메시지에서 "뭘 했는지" 추출, diff에서 "어떻게 했는지" 추출
- 사소한 수정(typo fix, formatting)은 짧게 요약하거나 생략
- 의미 있는 변경만 깊게 서술`;

/** Commits (짧은 커밋 로그) 전용 */
const BRIEF_STRUCTURE = `- 한 줄 요약 (커밋 메시지를 자연어로)
- 변경 내용 (무엇을 어떻게 바꿨는지, 2~4문장)
- 코드 스니펫 (핵심 변경 부분만, 선택적)
- 한 줄 메모 (삽질 포인트 또는 다음 할 일)
- 전체 500~1000자 이내
- 섹션 헤딩(##) 사용 금지 — 일반 문단으로만
- 코드 블록은 최대 1개, 핵심 부분만 20줄 이내`;

const BRIEF_FOCUS = `- 설명보다 기록 중심. "이걸 했다, 이래서 했다"
- 불필요한 배경 설명 없이 바로 본론`;

/* ───── DB Key Mapping ───── */

const STYLE_KEYS = {
  tone: "writing_tone",
  prohibitions: "writing_prohibitions",
  persona: "writing_persona",
  closing: "writing_closing",
  signal_structure: "writing_signal_structure",
  signal_focus: "writing_signal_focus",
  commits_structure: "writing_commits_structure",
  commits_focus: "writing_commits_focus",
  brief_structure: "writing_brief_structure",
  brief_focus: "writing_brief_focus",
} as const;

export type WritingStyleKey = keyof typeof STYLE_KEYS;

/** DB에서 글쓰기 스타일 오버라이드 조회 (없으면 코드 기본값) */
const loadStyleOverrides = async (): Promise<Record<string, string>> => {
  try {
    const dbKeys = Object.values(STYLE_KEYS);
    const rows = await prisma.setting.findMany({
      where: { key: { in: dbKeys } },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    // DB 접속 실패 시 기본값만 사용
    return {};
  }
};

const resolve = (overrides: Record<string, string>, key: WritingStyleKey, fallback: string): string =>
  overrides[STYLE_KEYS[key]] || fallback;

/* ───── Public API ───── */

export type WritingCategory = "signal" | "commits" | "brief";

export interface WritingStyle {
  persona: string;
  tone: string;
  prohibitions: string;
  closing: string;
  structure: string;
  focus: string;
}

/** 카테고리별 글쓰기 스타일 로드 (DB 오버라이드 > 코드 기본값) */
export const getWritingStyle = async (category: WritingCategory): Promise<WritingStyle> => {
  const ov = await loadStyleOverrides();

  const common = {
    persona: resolve(ov, "persona", DEFAULT_PERSONA),
    tone: resolve(ov, "tone", DEFAULT_TONE),
    prohibitions: resolve(ov, "prohibitions", DEFAULT_PROHIBITIONS),
    closing: resolve(ov, "closing", DEFAULT_CLOSING),
  };

  switch (category) {
    case "signal":
      return {
        ...common,
        structure: resolve(ov, "signal_structure", SIGNAL_STRUCTURE),
        focus: resolve(ov, "signal_focus", SIGNAL_FOCUS),
      };
    case "commits":
      return {
        ...common,
        structure: resolve(ov, "commits_structure", COMMITS_STRUCTURE),
        focus: resolve(ov, "commits_focus", COMMITS_FOCUS),
      };
    case "brief":
      return {
        ...common,
        structure: resolve(ov, "brief_structure", BRIEF_STRUCTURE),
        focus: resolve(ov, "brief_focus", BRIEF_FOCUS),
      };
  }
};

/* ───── 모델별 프롬프트 보정 ───── */

interface ModelHint {
  /** 모델 이름 패턴 (소문자 매칭) */
  match: (model: string) => boolean;
  /** 시스템 프롬프트 앞에 추가할 지시 */
  preamble: string;
  /** 시스템 프롬프트 뒤에 추가할 강조 */
  postscript: string;
}

const MODEL_HINTS: ModelHint[] = [
  {
    match: (m) => m.includes("claude") || m.includes("anthropic"),
    preamble: `<role>
당신은 radarlog.kr 테크 블로그의 시니어 테크 에디터다.
단순 뉴스 전달이 아니라, 개발자가 읽고 "아 그래서 이게 중요하구나"를 느끼게 하는 글을 쓴다.
</role>

<style_guide>
- 글의 흐름을 자연스러운 산문(prose)으로 이어가라. 불릿 포인트 나열 금지.
- 각 뉴스를 독립된 섹션이 아닌, 하나의 스토리로 엮어라. 항목 간 맥락과 흐름이 있어야 한다.
- 기술적 배경이 필요하면 괄호나 부연 설명으로 자연스럽게 녹여라.
- 제목 다음의 첫 문장이 가장 중요하다 — 독자를 즉시 끌어당기는 hook으로 시작하라.
- 마크다운 볼드(**)는 정말 핵심 키워드에만. 남용 금지.
</style_guide>

<quality_bar>
- 각 뉴스 항목에 대해: 팩트(무엇) → 맥락(왜 지금) → 영향(개발자에게 어떤 의미) 3단계로 서술
- 관련 뉴스끼리 묶어서 더 큰 트렌드를 짚어라 (예: "이번 주는 에이전트 프레임워크 전쟁이다")
- 단순 요약이 아닌, 필자의 시각이 담긴 코멘트를 넣어라
- 전체 3000~5000자
</quality_bar>`,
    postscript: "",
  },
  {
    match: (m) => m.includes("grok"),
    preamble: `## ⚠️ 중요 지시
- 유머나 밈 표현을 자제하고, 기술적 정확성에 집중하라.
- 각 뉴스 항목에 원문 링크를 반드시 포함하라.`,
    postscript: "",
  },
  {
    match: (m) => m.includes("gemini") || m.includes("google"),
    preamble: `## ⚠️ 중요 지시
- 안전 면책(disclaimer)이나 "I'm an AI" 류 문구를 넣지 마라.
- 블로그 글처럼 자연스러운 톤을 유지하라.`,
    postscript: "",
  },
  {
    match: (m) => m.includes("gpt"),
    preamble: `## ⚠️ 중요 지시
- "Sure!" "Absolutely!" 같은 영어 필러 금지.
- 마크다운 볼드(**) 남용 금지. 정말 강조할 단어만 볼드.`,
    postscript: "",
  },
];

const getModelHint = (model: string): { preamble: string; postscript: string } => {
  const lower = model.toLowerCase();
  const hint = MODEL_HINTS.find((h) => h.match(lower));
  return hint ?? { preamble: "", postscript: "" };
};

/** WritingStyle → 시스템 프롬프트 문자열 조립 (모델별 보정 포함) */
export const buildSystemPrompt = (style: WritingStyle, responseFormat: string, model?: string): string => {
  const { preamble, postscript } = model ? getModelHint(model) : { preamble: "", postscript: "" };

  return `${preamble ? preamble + "\n\n" : ""}${style.persona}

## 문체 규칙

${style.tone}

## 핵심 포인트

${style.focus}

## 구조

${style.structure}

## 마무리

${style.closing}

## 금지

${style.prohibitions}

## 응답 형식

${responseFormat}${postscript ? "\n\n" + postscript : ""}`;
};

/** DB 키 목록 export (admin API에서 사용) */
export const WRITING_STYLE_KEYS = STYLE_KEYS;

/** 기본값 export (admin UI에서 placeholder 용) */
export const WRITING_DEFAULTS: Record<WritingStyleKey, string> = {
  tone: DEFAULT_TONE,
  prohibitions: DEFAULT_PROHIBITIONS,
  persona: DEFAULT_PERSONA,
  closing: DEFAULT_CLOSING,
  signal_structure: SIGNAL_STRUCTURE,
  signal_focus: SIGNAL_FOCUS,
  commits_structure: COMMITS_STRUCTURE,
  commits_focus: COMMITS_FOCUS,
  brief_structure: BRIEF_STRUCTURE,
  brief_focus: BRIEF_FOCUS,
};
