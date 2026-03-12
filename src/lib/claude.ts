import OpenAI from "openai";

const getClient = () =>
  new OpenAI({
    apiKey: process.env.Z_AI_API_KEY || "dummy",
    baseURL: "https://api.z.ai/api/coding/paas/v4",
  });

const SYSTEM_PROMPT = `당신은 "레이더"라는 개발자의 기술 블로그 글 작성자입니다.
커밋 정보를 바탕으로 기술 블로그 글을 작성합니다.

## 문체 규칙

- 대화체. "~합니다"가 아니라 "~다" 체. 친구한테 설명하듯이.
- 첫 문장에 핵심. 도입부 없이 바로 들어간다.
- 솔직하게. 삽질, 실수, 모르는 것을 숨기지 않는다.
- 게임 개발자 시각. UE5, 서버 아키텍처, 성능 최적화 감각이 자연스럽게 드러난다.

## 금지

- "~하겠습니다", "~인 것 같습니다" 같은 존댓말
- 불릿 포인트, 넘버링 리스트 (코드 블록 안의 나열도 최소화)
- "이 글에서는 ~에 대해 알아보겠습니다" 같은 교과서 도입부
- "정리하자면", "요약하면" 같은 상투적 결론
- 이모지 남용

## 필수 포함

- Before/After 코드 대비 (변경이 있을 때)
- 구체적 숫자 ($0.008, 120ms → 3ms, 15배 차이 등)
- "왜 이렇게 했는지" + "다른 방법은 왜 안 됐는지"
- 삽질 포인트 ("여기서 3시간 날렸다")
- 마지막은 인용구(>) 형태의 한줄 정리로 마무리

## 구조

- 고정 구조 없이 내용에 맞게 유연하게
- ## 섹션 최소 4개, 각 섹션은 3~5개 문단 + 코드 블록 1개 이상
- 편당 5000~8000자 (한국어 기준)
- 문단은 3~4줄 이내, 문단 사이 빈 줄
- 코드 블록 앞뒤 빈 줄
- 코드 블록에는 언어 명시

## 커밋 기반 글 특화

- 커밋 메시지에서 "뭘 했는지" 추출, diff에서 "어떻게 했는지" 추출
- 사소한 수정(typo fix, formatting)은 짧게 요약하거나 생략
- 의미 있는 변경만 깊게 서술
- 프로젝트 컨텍스트를 반영

## 응답 형식

반드시 JSON으로 응답:
{
  "title": "글 제목 (커밋 내용을 한 줄로 요약, 기술적이면서 흥미로운 제목)",
  "content": "마크다운 본문 (## 헤딩 사용, 코드 블록 포함)",
  "tags": ["태그1", "태그2", "태그3"]
}`;

const BRIEF_SYSTEM_PROMPT = `당신은 "레이더"라는 개발자의 기술 블로그 커밋 로그 작성자입니다.
커밋 정보를 바탕으로 짧고 실용적인 개발 일지를 작성합니다.

## 문체 규칙

- "~다" 체. 짧고 직설적으로.
- 설명보다 기록 중심. "이걸 했다, 이래서 했다"
- 불필요한 배경 설명 없이 바로 본론

## 구조 (고정)

1. 한 줄 요약 (커밋 메시지를 자연어로)
2. 변경 내용 (무엇을 어떻게 바꿨는지, 2~4문장)
3. 코드 스니펫 (핵심 변경 부분만, 선택적)
4. 한 줄 메모 (삽질 포인트 또는 다음 할 일)

## 제약

- 전체 500~1000자 이내
- 섹션 헤딩(##) 사용 금지 — 일반 문단으로만
- 코드 블록은 최대 1개, 핵심 부분만 20줄 이내

## 응답 형식

반드시 JSON으로 응답:
{
  "title": "커밋 한 줄 요약 제목",
  "content": "마크다운 본문 (헤딩 없이 문단 + 선택적 코드 블록)",
  "tags": ["태그1", "태그2"]
}`;

interface GenerateOptions {
  commitMessage: string;
  diff: string;
  repoName: string;
  filesChanged: { filename: string; status: string; additions?: number; deletions?: number; patch?: string }[];
  customPrompt?: string;
  locale?: "ko" | "en";
  brief?: boolean;
}

export const generateBlogContent = async ({
  commitMessage,
  repoName,
  filesChanged,
  customPrompt,
  locale = "ko",
  brief = false,
}: GenerateOptions): Promise<{ title: string; content: string; tags: string[] }> => {
  const filesSummary = filesChanged
    .map(
      (f) =>
        `- ${f.filename} (${f.status}, +${f.additions || 0}/-${f.deletions || 0})${
          f.patch ? `\n  \`\`\`\n  ${f.patch}\n  \`\`\`` : ""
        }`
    )
    .join("\n");

  const totalAdditions = filesChanged.reduce((sum, f) => sum + (f.additions || 0), 0);
  const totalDeletions = filesChanged.reduce((sum, f) => sum + (f.deletions || 0), 0);

  let systemPrompt = brief ? BRIEF_SYSTEM_PROMPT : SYSTEM_PROMPT;
  if (customPrompt) {
    systemPrompt += `\n\n## 추가 지시사항\n\n${customPrompt}`;
  }
  if (locale === "en") {
    systemPrompt += "\n\n## Language\n\nWrite in English. Natural, conversational tone.";
  }

  const response = await getClient().chat.completions.create({
    model: "glm-5",
    max_tokens: brief ? 2000 : 8000,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `레포: ${repoName}
커밋 메시지: ${commitMessage}
변경 통계: ${filesChanged.length} files changed, +${totalAdditions} -${totalDeletions}

변경 파일:
${filesSummary}

이 커밋 내용을 바탕으로 기술 블로그 글을 작성해줘. JSON으로 응답해.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";

  // JSON 추출 (코드블록 감싸진 경우 처리)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const usage = response.usage;
  const tokenBadge = usage
    ? `> 🤖 \`${usage.prompt_tokens} in / ${usage.completion_tokens} out / ${usage.total_tokens} total tokens\`\n\n`
    : "";

  return {
    title: parsed.title,
    content: tokenBadge + parsed.content,
    tags: parsed.tags || [],
  };
};
