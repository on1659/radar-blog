/**
 * LLM 기반 할루시네이션 판별기
 * 글 생성에 사용한 것과 같은 AI(z.ai/glm-5)로 교차 검증
 * — 소스 뉴스 원문 vs AI 생성 글 대조
 * — 지어낸 사실, 없는 인용, 날짜 오류 등 탐지
 */

import OpenAI from "openai";
import { getAIConfig } from "./claude";

/* ───── Types ───── */

export interface HallucinationResult {
  /** 할루시네이션 판정 (true = 문제 있음) */
  hallucinated: boolean;
  /** 신뢰도 0~100 (높을수록 정상) */
  confidence: number;
  /** 의심 항목 목록 */
  suspects: HallucinationSuspect[];
  /** LLM 원문 판단 요약 */
  summary: string;
}

interface HallucinationSuspect {
  /** 의심 유형 */
  type: "fake_source" | "wrong_attribution" | "fabricated_fact" | "date_error" | "nonexistent_entity" | "misleading_claim";
  /** 문제가 되는 원문 발췌 */
  excerpt: string;
  /** 왜 의심되는지 */
  reason: string;
  /** 심각도 */
  severity: "high" | "medium" | "low";
}

/* ───── System Prompt ───── */

const CHECKER_PROMPT = `당신은 AI가 생성한 기술 블로그 글의 사실 검증(fact-check) 전문가입니다.

## 역할

AI가 뉴스 소스를 기반으로 작성한 블로그 글을 검토합니다.
원본 소스 정보와 생성된 글을 대조하여 할루시네이션(지어낸 내용)을 탐지합니다.

## 검증 항목

1. **가짜 출처 (fake_source)**: 존재하지 않는 논문, 기사, 블로그 포스트를 인용
2. **잘못된 귀속 (wrong_attribution)**: 실제 인물/기관의 말이나 행동을 잘못 기술
3. **지어낸 사실 (fabricated_fact)**: 소스에 없는 구체적 수치, 날짜, 결과를 창작
4. **날짜 오류 (date_error)**: 이벤트/출시/발표 날짜가 틀림
5. **존재하지 않는 엔티티 (nonexistent_entity)**: 실존하지 않는 모델명, 회사명, 제품명
6. **오도하는 주장 (misleading_claim)**: 소스 내용을 과장하거나 왜곡

## 판단 기준

- 소스에 명시된 정보와 생성 글이 일치하면 → 정상
- 소스에 없는 구체적 정보(숫자, 이름, 날짜)가 생성 글에 있으면 → 의심
- 일반 상식 수준의 배경 설명은 할루시네이션이 아님
- 소스 URL이 제공되지 않은 항목은 내용 자체의 일관성으로 판단

## 응답 형식

반드시 JSON으로 응답:
{
  "hallucinated": true/false,
  "confidence": 0~100,
  "suspects": [
    {
      "type": "fake_source|wrong_attribution|fabricated_fact|date_error|nonexistent_entity|misleading_claim",
      "excerpt": "문제가 되는 글 발췌",
      "reason": "왜 할루시네이션으로 의심되는지",
      "severity": "high|medium|low"
    }
  ],
  "summary": "전체 판단 요약 (1~2문장)"
}

hallucinated 판정 기준:
- high severity가 1개 이상 → hallucinated: true
- medium severity가 3개 이상 → hallucinated: true
- 그 외 → hallucinated: false`;

/* ───── Main Checker ───── */

interface CheckOptions {
  /** AI가 생성한 글 본문 */
  content: string;
  /** 글 제목 */
  title: string;
  /** 원본 소스 뉴스 (글 생성에 사용된 입력) */
  sourceContext?: string;
}

export const checkHallucination = async (options: CheckOptions): Promise<HallucinationResult> => {
  const { content, title, sourceContext } = options;

  const { baseURL, apiKey, model } = await getAIConfig();
  const client = new OpenAI({ apiKey, baseURL });

  const userMessage = sourceContext
    ? `## 원본 소스 (AI가 참고한 뉴스)

${sourceContext}

## AI가 생성한 글

제목: ${title}

${content}

위 원본 소스와 생성된 글을 대조하여 할루시네이션을 검증해주세요. JSON으로 응답해.`
    : `## AI가 생성한 글 (원본 소스 없음 — 내용 자체 일관성으로 판단)

제목: ${title}

${content}

이 글에서 지어낸 사실, 존재하지 않는 엔티티, 날짜 오류 등을 검증해주세요. JSON으로 응답해.`;

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 2000,
      messages: [
        { role: "system", content: CHECKER_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        hallucinated: false,
        confidence: 50,
        suspects: [],
        summary: "LLM 응답 파싱 실패 — 판단 보류",
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      hallucinated: parsed.hallucinated ?? false,
      confidence: parsed.confidence ?? 50,
      suspects: (parsed.suspects ?? []).map((s: Record<string, string>) => ({
        type: s.type || "fabricated_fact",
        excerpt: s.excerpt || "",
        reason: s.reason || "",
        severity: s.severity || "medium",
      })),
      summary: parsed.summary ?? "",
    };
  } catch (err) {
    console.error("[HallucinationChecker] LLM call failed:", err);
    return {
      hallucinated: false,
      confidence: 0,
      suspects: [],
      summary: `LLM 호출 실패: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
};

/** 할루시네이션 결과 로그 출력 */
export const logHallucinationCheck = (postId: string, result: HallucinationResult) => {
  const tag = result.hallucinated ? "🔴 HALLUCINATED" : "🟢 CLEAN";
  console.log(`[HallucinationChecker] ${tag} post=${postId} confidence=${result.confidence}`);
  console.log(`  📝 ${result.summary}`);
  for (const s of result.suspects) {
    const icon = s.severity === "high" ? "🚨" : s.severity === "medium" ? "⚠️" : "💡";
    console.log(`  ${icon} [${s.type}] ${s.reason}`);
    if (s.excerpt) console.log(`     "${s.excerpt.slice(0, 100)}..."`);
  }
};

/** 할루시네이션 결과를 마크다운 배너로 생성 */
export const buildHallucinationBanner = (result: HallucinationResult): string => {
  if (!result.hallucinated) return "";

  const lines = [
    `> **🔴 AI 할루시네이션 감지** (신뢰도: ${result.confidence}/100)`,
    ">",
    `> ${result.summary}`,
    ">",
  ];
  for (const s of result.suspects) {
    const icon = s.severity === "high" ? "🚨" : s.severity === "medium" ? "⚠️" : "💡";
    lines.push(`> ${icon} **${s.type}**: ${s.reason}`);
  }
  lines.push(">");
  lines.push("> 이 글은 AI가 사실과 다른 내용을 생성한 것으로 판별되었습니다.");
  return lines.join("\n") + "\n\n---\n\n";
};
