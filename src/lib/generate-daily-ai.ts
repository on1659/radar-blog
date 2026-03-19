import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { prisma } from "./prisma";
import { calculateReadingTime } from "./markdown";
import { fetchAINews } from "./fetch-ai-news";
import { getAIConfig } from "./claude";
import { getWritingStyle, buildSystemPrompt } from "@/config/writing-style";
import { validatePost, logValidation, buildFailureBanner } from "./post-validator";
import { type RawSignalItem, SLOT_CONFIG, TOTAL_SLOTS } from "./signal-sources";

const SIGNAL_RESPONSE_FORMAT = `반드시 JSON으로 응답:
{
  "title": "AI 업데이트: 핵심 키워드 요약",
  "content": "마크다운 본문",
  "titleEn": "English title",
  "contentEn": "English markdown body",
  "tags": ["태그1", "태그2", "태그3"]
}`;

const HOURLY_CAP = 6;

export const generateDailyAIPost = async (): Promise<{
  postId: string | null;
  skipped: boolean;
  reason?: string;
}> => {
  // 1시간 내 이미 생성된 signal 글이 있으면 스킵
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.post.count({
    where: { category: "signal", createdAt: { gte: oneHourAgo } },
  });

  if (recentCount >= HOURLY_CAP) {
    return { postId: null, skipped: true, reason: `Hourly cap reached (${recentCount}/${HOURLY_CAP})` };
  }

  // 소스 수집 + dedup + 슬롯제 선별
  const news = await fetchAINews();

  if (news.length === 0) {
    return { postId: null, skipped: true, reason: "No AI news found from any source" };
  }

  // SignalItem 테이블에 upsert (externalId 기반 중복 차단)
  await upsertSignalItems(news);

  // 미사용 아이템만 조회 (48h 이내, usedInPost=null)
  const freshItems = await prisma.signalItem.findMany({
    where: {
      usedInPost: null,
      fetchedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    },
    orderBy: { score: "desc" },
    take: 30,
  });

  if (freshItems.length < 2) {
    return { postId: null, skipped: true, reason: `Only ${freshItems.length} fresh items (need at least 2)` };
  }

  // 슬롯제 재적용 (DB에서 가져온 fresh items 기준)
  const topItems = selectFreshBySlots(freshItems);

  // AI로 글 생성 (공통 글쓰기 스타일 사용)
  const { baseURL, apiKey, model } = await getAIConfig();
  const client = new OpenAI({ apiKey, baseURL });

  const style = await getWritingStyle("signal");
  const systemPrompt = buildSystemPrompt(style, SIGNAL_RESPONSE_FORMAT);

  const newsContext = topItems
    .map((n, i) => `${i + 1}. [${n.source}] ${n.title}\n   URL: ${n.url}\n   Score: ${n.score}${n.summary ? `\n   Summary: ${n.summary.slice(0, 200)}` : ""}`)
    .join("\n\n");

  const response = await client.chat.completions.create({
    model,
    max_tokens: 6000,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `오늘 수집된 AI 관련 뉴스입니다 (${topItems.length}건, 다양한 소스). 이를 바탕으로 Daily AI 업데이트 글을 작성해주세요.\n\n${newsContext}\n\nJSON으로 응답해.`,
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

  // DB 저장 (slug = cuid 기반, 경합 불가)
  const slug = `signal-${crypto.randomUUID().slice(0, 12)}`;
  const readingTime = calculateReadingTime(content);
  const excerpt = content.replace(/[#*`>\[\]]/g, "").slice(0, 200);
  const excerptEn = contentEn ? contentEn.replace(/[#*`>\[\]]/g, "").slice(0, 200) : null;

  // 검수: URL 유효성 + 콘텐츠 품질 + LLM 할루시네이션 판별
  const validation = await validatePost({
    content,
    title: parsed.title,
    minLength: 800,
    maxLength: 8000,
    requireSources: true,
    checkHallucination: true,
    sourceContext: newsContext,
  });

  // 검수 실패 → hallucination 카테고리 + 사유 배너 삽입, 통과 → signal
  const finalContent = validation.passed ? content : buildFailureBanner(validation) + content;
  const finalContentEn = validation.passed ? contentEn : (contentEn ? buildFailureBanner(validation) + contentEn : contentEn);

  const post = await prisma.post.create({
    data: {
      title: parsed.title,
      titleEn: parsed.titleEn || null,
      content: finalContent,
      contentEn: finalContentEn,
      excerpt,
      excerptEn,
      slug,
      category: validation.passed ? "signal" : "hallucination",
      tags: validation.passed ? (parsed.tags || ["AI", "Daily"]) : [...(parsed.tags || ["AI", "Daily"]), "검수실패"],
      readingTime,
      published: true,
      validationScore: validation.score,
      validationIssues: validation.issues.length > 0 ? JSON.stringify(validation.issues) : null,
      validatedAt: new Date(),
    },
  });

  logValidation(post.id, validation);

  // 썸네일 설정
  await prisma.post.update({
    where: { id: post.id },
    data: { coverImage: `/api/thumbnail/${post.id}` },
  });

  // 검수 통과 시에만 SignalItem 소비 (실패 시 다음 실행에서 재사용)
  if (validation.passed) {
    await prisma.signalItem.updateMany({
      where: { id: { in: topItems.map((i) => i.id) } },
      data: { usedInPost: post.id },
    });
  }

  // 검수 통과 시에만 캐시 갱신
  if (validation.passed) {
    try {
      revalidatePath("/");
      revalidatePath("/signal");
    } catch {
      console.error("Revalidation failed");
    }
  }

  const sourceSummary = [...new Set(topItems.map((n) => n.source.split(" ")[0]))].join(", ");
  console.log(`Generated daily AI post: ${post.id} (${topItems.length} items, sources: ${sourceSummary}, validation: ${validation.passed ? "PASS" : "FAIL"} score=${validation.score})`);

  return { postId: post.id, skipped: false };
};

/* ───── SignalItem upsert ───── */

const upsertSignalItems = async (items: RawSignalItem[]) => {
  for (const item of items) {
    try {
      await prisma.signalItem.upsert({
        where: { externalId: item.externalId },
        create: {
          externalId: item.externalId,
          canonicalUrl: item.canonicalUrl,
          source: item.source,
          sourceType: item.sourceType,
          title: item.title,
          url: item.url,
          score: item.score,
          summary: item.summary,
          fetchedAt: new Date(),
        },
        update: {
          score: item.score,
        },
      });
    } catch (e) {
      // unique constraint 충돌 등 개별 실패는 무시
      console.error(`SignalItem upsert failed for ${item.externalId}:`, e);
    }
  }
};

/* ───── DB fresh items → 슬롯제 선별 ───── */

interface SignalItemRow {
  id: string;
  source: string;
  sourceType: string;
  title: string;
  url: string;
  score: number;
  summary: string | null;
}

const selectFreshBySlots = (items: SignalItemRow[]): SignalItemRow[] => {
  const slots = SLOT_CONFIG;
  const byType: Record<string, SignalItemRow[]> = { community: [], research: [], industry: [] };

  for (const item of items) {
    byType[item.sourceType]?.push(item);
  }

  const selected: SignalItemRow[] = [];
  const remaining: SignalItemRow[] = [];

  for (const type of ["community", "research", "industry"] as const) {
    const slot = slots[type];
    const pool = byType[type] ?? [];
    selected.push(...pool.slice(0, slot));
    remaining.push(...pool.slice(slot));
  }

  // 부족분 채우기
  if (selected.length < TOTAL_SLOTS) {
    remaining.sort((a, b) => b.score - a.score);
    selected.push(...remaining.slice(0, TOTAL_SLOTS - selected.length));
  }

  return selected;
};
