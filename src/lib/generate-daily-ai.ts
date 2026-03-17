import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { prisma } from "./prisma";
import { calculateReadingTime } from "./markdown";
import { fetchAINews, type NewsItem } from "./fetch-ai-news";

const getClient = () =>
  new OpenAI({
    apiKey: process.env.Z_AI_API_KEY || "dummy",
    baseURL: "https://api.z.ai/api/coding/paas/v4",
  });

const DAILY_AI_PROMPT = `당신은 "이더"라는 개발자의 기술 블로그에서 AI 뉴스 다이제스트를 작성하는 역할입니다.
수집된 AI 관련 뉴스를 바탕으로 하나의 블로그 글을 작성합니다.

## 문체 규칙

- "~다" 체. 친구한테 설명하듯이 자연스럽게.
- 뉴스 나열이 아니라, 개발자 관점에서 해석과 코멘트를 곁들인다.
- 각 뉴스에 대해 "이게 왜 중요한지" 한줄 코멘트를 추가한다.

## 구조

- 제목은 "AI 업데이트: {핵심 키워드}" 형식
- 본문은 ## 섹션으로 구분, 각 뉴스/주제별 섹션
- 섹션마다 뉴스 제목 + 원문 링크 + 2~3문장 해설
- 마지막에 > 인용구로 오늘의 한줄 정리
- 전체 2000~4000자

## 금지

- 단순 번역이나 복붙
- "~하겠습니다" 같은 존댓말
- 이모지 남용

## 응답 형식

반드시 JSON으로 응답:
{
  "title": "AI 업데이트: 핵심 키워드 요약",
  "content": "마크다운 본문",
  "titleEn": "English title",
  "contentEn": "English markdown body",
  "tags": ["태그1", "태그2", "태그3"]
}`;

const HOURLY_CAP = 1;

export const generateDailyAIPost = async (): Promise<{
  postId: string | null;
  skipped: boolean;
  reason?: string;
}> => {
  // 1시간 내 이미 생성된 daily 글이 있으면 스킵
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.post.count({
    where: { category: "daily", createdAt: { gte: oneHourAgo } },
  });

  if (recentCount >= HOURLY_CAP) {
    return { postId: null, skipped: true, reason: `Hourly cap reached (${recentCount}/${HOURLY_CAP})` };
  }

  // 뉴스 수집
  const news = await fetchAINews(6);

  if (news.length === 0) {
    return { postId: null, skipped: true, reason: "No AI news found in the last 6 hours" };
  }

  // 이미 다룬 뉴스 URL 확인 (최근 24시간 daily 글의 content에서)
  const recentDailyPosts = await prisma.post.findMany({
    where: {
      category: "daily",
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { content: true },
  });

  const coveredUrls = new Set<string>();
  for (const post of recentDailyPosts) {
    const urlMatches = post.content.match(/https?:\/\/[^\s)]+/g);
    if (urlMatches) urlMatches.forEach((u) => coveredUrls.add(u));
  }

  const freshNews = news.filter((n) => !coveredUrls.has(n.url));

  if (freshNews.length < 2) {
    return { postId: null, skipped: true, reason: `Only ${freshNews.length} fresh news items (need at least 2)` };
  }

  // Claude로 글 생성
  const newsContext = freshNews
    .map((n, i) => `${i + 1}. ${n.title}\n   URL: ${n.url}\n   Points: ${n.points}`)
    .join("\n");

  const response = await getClient().chat.completions.create({
    model: "glm-5",
    max_tokens: 6000,
    messages: [
      { role: "system", content: DAILY_AI_PROMPT },
      {
        role: "user",
        content: `오늘 수집된 AI 관련 뉴스입니다. 이를 바탕으로 Daily AI 업데이트 글을 작성해주세요.\n\n${newsContext}\n\nJSON으로 응답해.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const usage = response.usage;
  const tokenBadge = usage
    ? `> 🤖 \`${usage.prompt_tokens} in / ${usage.completion_tokens} out / ${usage.total_tokens} total tokens\`\n\n`
    : "";

  const content = tokenBadge + parsed.content;
  const contentEn = parsed.contentEn ? tokenBadge + parsed.contentEn : null;

  // DB 저장
  const postCount = await prisma.post.count();
  const slug = String(postCount + 1);
  const readingTime = calculateReadingTime(content);
  const excerpt = content.replace(/[#*`>\[\]]/g, "").slice(0, 200);
  const excerptEn = contentEn ? contentEn.replace(/[#*`>\[\]]/g, "").slice(0, 200) : null;

  const post = await prisma.post.create({
    data: {
      title: parsed.title,
      titleEn: parsed.titleEn || null,
      content,
      contentEn,
      excerpt,
      excerptEn,
      slug,
      category: "daily",
      tags: parsed.tags || ["AI", "Daily"],
      readingTime,
      published: true,
    },
  });

  // 썸네일 설정
  await prisma.post.update({
    where: { id: post.id },
    data: { coverImage: `/api/thumbnail/${post.id}` },
  });

  // ISR 캐시 갱신
  try {
    revalidatePath("/");
    revalidatePath("/daily");
  } catch {
    console.error("Revalidation failed");
  }

  console.log(`Generated daily AI post: ${post.id} (${freshNews.length} news items)`);

  return { postId: post.id, skipped: false };
};
