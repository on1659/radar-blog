import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { prisma, nextSlug, createPostWithSlug } from "./prisma";
import { calculateReadingTime } from "./markdown";
import { fetchAINews, fetchClaudeNews, matchesClaudeKeyword } from "./fetch-ai-news";
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
const ITEMS_PER_POST = 5; // 15개 수집 → 5개씩 3글로 분산 (매 트리거마다 1글)

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

  // 상위 ITEMS_PER_POST개만 선택 (나머지는 다음 트리거에서 사용)
  const topItems = freshItems
    .sort((a, b) => b.score - a.score)
    .slice(0, ITEMS_PER_POST);

  // AI로 글 생성 (공통 글쓰기 스타일 사용)
  const { baseURL, apiKey, model } = await getAIConfig();
  const client = new OpenAI({ apiKey, baseURL });

  const style = await getWritingStyle("signal");
  const systemPrompt = buildSystemPrompt(style, SIGNAL_RESPONSE_FORMAT, model);

  const newsContext = topItems
    .map((n, i) => `${i + 1}. [${n.source}] ${n.title}\n   URL: ${n.url}\n   Score: ${n.score}${n.summary ? `\n   Summary: ${n.summary.slice(0, 200)}` : ""}`)
    .join("\n\n");

  const response = await client.chat.completions.create({
    model,
    max_tokens: 6000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `오늘 수집된 AI 관련 뉴스입니다 (${topItems.length}건, 다양한 소스). 이를 바탕으로 Daily AI 업데이트 글을 작성해주세요.\n\n${newsContext}\n\nJSON으로 응답해.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  let jsonMatch = text.match(/\{[\s\S]*\}/);

  // JSON 파싱 실패 시 재시도: AI에게 텍스트를 JSON으로 변환 요청
  if (!jsonMatch) {
    console.warn(`AI response was not JSON (model=${model}, length=${text.length}). First 500 chars:`, text.slice(0, 500));
    console.warn("Retrying with JSON conversion prompt...");
    const retry = await client.chat.completions.create({
      model,
      max_tokens: 6000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "아래 텍스트를 JSON 형식으로 변환하라. 다른 설명 없이 JSON만 출력하라." },
        { role: "user", content: `다음 글을 이 JSON 형식으로 변환해:\n${SIGNAL_RESPONSE_FORMAT}\n\n---\n\n${text}` },
      ],
    });
    const retryText = retry.choices[0]?.message?.content ?? "";
    jsonMatch = retryText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`Retry also failed (length=${retryText.length}). First 500 chars:`, retryText.slice(0, 500));
      throw new Error("Failed to parse AI response as JSON after retry");
    }
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const usage = response.usage;
  const tokenBadge = usage
    ? `> 🤖 \`${usage.prompt_tokens} in / ${usage.completion_tokens} out / ${usage.total_tokens} total tokens\`\n\n`
    : "";

  const content = tokenBadge + parsed.content;
  const contentEn = parsed.contentEn ? tokenBadge + parsed.contentEn : null;

  // DB 저장 (순차 숫자 slug)
  const slug = await nextSlug();
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

  const post = await createPostWithSlug({
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
  });

  logValidation(post.id, validation);

  // 썸네일 설정
  await prisma.post.update({
    where: { id: post.id },
    data: { coverImage: `/api/thumbnail/${post.id}` },
  });

  // SignalItem 소비 처리 (실패해도 소비 — 미소비 시 같은 아이템으로 무한 재생성됨)
  await prisma.signalItem.updateMany({
    where: { id: { in: topItems.map((i) => i.id) } },
    data: { usedInPost: post.id },
  });

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

/* ───── Claude/Anthropic 전용 글 생성 ───── */

const CLAUDE_RESPONSE_FORMAT = `반드시 JSON으로 응답:
{
  "title": "Claude/Anthropic 업데이트: 핵심 요약",
  "content": "마크다운 본문 (Claude/Anthropic 중심 분석)",
  "titleEn": "English title",
  "contentEn": "English markdown body",
  "tags": ["Claude", "Anthropic", "태그3"]
}`;

export const generateClaudePost = async (): Promise<{
  postId: string | null;
  skipped: boolean;
  reason?: string;
}> => {
  // 2시간 내 Claude 태그 글이 있으면 스킵
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const recentClaude = await prisma.post.count({
    where: {
      category: "signal",
      createdAt: { gte: twoHoursAgo },
      tags: { hasSome: ["Claude", "Anthropic"] },
    },
  });

  if (recentClaude >= 1) {
    return { postId: null, skipped: true, reason: `Claude post exists within 2h (${recentClaude})` };
  }

  // Claude 전용 소스 수집
  const news = await fetchClaudeNews();
  console.log(`[Claude Post] fetchClaudeNews returned ${news.length} items`);

  if (news.length === 0) {
    return { postId: null, skipped: true, reason: "No Claude/Anthropic news found from any source" };
  }

  // SignalItem upsert — Claude 전용 externalId로 저장 (일반 파이프라인과 분리)
  for (const item of news) {
    if (!item.externalId.startsWith("claude:")) {
      item.externalId = `claude:${item.externalId}`;
    }
  }

  let upsertOk = 0;
  let upsertFail = 0;
  for (const item of news) {
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
        update: { score: item.score },
      });
      upsertOk++;
    } catch (e) {
      upsertFail++;
      console.error(`[Claude Post] upsert failed: ${item.externalId}`, e);
    }
  }
  console.log(`[Claude Post] Upsert: ${upsertOk} ok, ${upsertFail} fail`);

  // DB에서 Claude 전용 미사용 아이템 조회
  const dbItems = await prisma.signalItem.findMany({
    where: {
      usedInPost: null,
      fetchedAt: { gte: new Date(Date.now() - 72 * 60 * 60 * 1000) },
      externalId: { startsWith: "claude:" },
    },
    orderBy: { score: "desc" },
    take: 10,
  });

  // 이중 방어: fetch 시점 필터가 바뀌기 전 upsert된 오염 행이 DB에 남아있을 수 있으므로 재검증
  const freshItems = dbItems.filter(
    (item) => matchesClaudeKeyword(item.title) || (!!item.summary && matchesClaudeKeyword(item.summary))
  );
  const staleCount = dbItems.length - freshItems.length;
  if (staleCount > 0) {
    console.warn(
      `[Claude Post] Dropped ${staleCount} stale DB item(s) that no longer match Claude keywords: ` +
      dbItems.filter((i) => !freshItems.includes(i)).map((i) => i.title.slice(0, 40)).join(" | ")
    );
  }

  console.log(`[Claude Post] Fresh items: ${freshItems.length}, titles: ${freshItems.map((i) => i.title.slice(0, 40)).join(" | ")}`);

  if (freshItems.length < 1) {
    // 디버그: upsert 결과 + DB 상태를 reason에 포함
    const allClaude = await prisma.signalItem.count({ where: { externalId: { startsWith: "claude:" } } });
    const usedClaude = await prisma.signalItem.count({ where: { externalId: { startsWith: "claude:" }, usedInPost: { not: null } } });
    return {
      postId: null,
      skipped: true,
      reason: `0 fresh Claude items (fetched=${news.length}, upsertOk=${upsertOk}, upsertFail=${upsertFail}, dbTotal=${allClaude}, dbUsed=${usedClaude}, staleFiltered=${staleCount})`,
    };
  }

  const topItems = freshItems.slice(0, 5);

  // AI로 글 생성
  const { baseURL, apiKey, model } = await getAIConfig();
  const client = new OpenAI({ apiKey, baseURL });

  const style = await getWritingStyle("signal");
  const systemPrompt = buildSystemPrompt(style, CLAUDE_RESPONSE_FORMAT, model);

  const newsContext = topItems
    .map((n, i) => `${i + 1}. [${n.source}] ${n.title}\n   URL: ${n.url}\n   Score: ${n.score}${n.summary ? `\n   Summary: ${n.summary.slice(0, 200)}` : ""}`)
    .join("\n\n");

  const response = await client.chat.completions.create({
    model,
    max_tokens: 6000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Claude/Anthropic 관련 최신 뉴스입니다 (${topItems.length}건). Claude와 Anthropic 중심으로 분석하는 업데이트 글을 작성해주세요. 기술적 의미와 개발자에게 미치는 영향을 중점적으로 다뤄주세요.\n\n${newsContext}\n\nJSON으로 응답해.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  let jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.warn(`[Claude Post] JSON parse failed, retrying...`);
    const retry = await client.chat.completions.create({
      model,
      max_tokens: 6000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "아래 텍스트를 JSON 형식으로 변환하라. 다른 설명 없이 JSON만 출력하라." },
        { role: "user", content: `다음 글을 이 JSON 형식으로 변환해:\n${CLAUDE_RESPONSE_FORMAT}\n\n---\n\n${text}` },
      ],
    });
    const retryText = retry.choices[0]?.message?.content ?? "";
    jsonMatch = retryText.match(/\{[\s\S]*\}/);
  }

  // JSON 파싱 실패 시에도 fallback으로 글 생성
  const parsed = jsonMatch
    ? JSON.parse(jsonMatch[0])
    : {
        title: `Claude & Anthropic 업데이트 — ${new Date().toLocaleDateString("ko-KR")}`,
        content: text || topItems.map((n) => `## ${n.title}\n\n${n.summary || ""}\n\n🔗 ${n.url}`).join("\n\n---\n\n"),
        titleEn: `Claude & Anthropic Update — ${new Date().toLocaleDateString("en-US")}`,
        contentEn: null,
        tags: ["Claude", "Anthropic"],
      };

  const usage = response.usage;
  const tokenBadge = usage
    ? `> 🤖 \`${usage.prompt_tokens} in / ${usage.completion_tokens} out / ${usage.total_tokens} total tokens\`\n\n`
    : "";

  const content = tokenBadge + (parsed.content || "");
  const contentEn = parsed.contentEn ? tokenBadge + parsed.contentEn : null;

  const slug = await nextSlug();
  const readingTime = calculateReadingTime(content);
  const excerpt = content.replace(/[#*`>\[\]]/g, "").slice(0, 200);
  const excerptEn = contentEn ? contentEn.replace(/[#*`>\[\]]/g, "").slice(0, 200) : null;

  const validation = await validatePost({
    content,
    title: parsed.title,
    minLength: 500,
    maxLength: 8000,
    requireSources: true,
    checkHallucination: true,
    sourceContext: newsContext,
  });

  const finalContent = validation.passed ? content : buildFailureBanner(validation) + content;
  const finalContentEn = validation.passed ? contentEn : (contentEn ? buildFailureBanner(validation) + contentEn : contentEn);

  const tags = [...new Set(["Claude", "Anthropic", ...(parsed.tags || [])])];

  const post = await createPostWithSlug({
    title: parsed.title,
    titleEn: parsed.titleEn || null,
    content: finalContent,
    contentEn: finalContentEn,
    excerpt,
    excerptEn,
    slug,
    category: validation.passed ? "signal" : "hallucination",
    tags: validation.passed ? tags : [...tags, "검수실패"],
    readingTime,
    published: true,
    validationScore: validation.score,
    validationIssues: validation.issues.length > 0 ? JSON.stringify(validation.issues) : null,
    validatedAt: new Date(),
  });

  logValidation(post.id, validation);

  await prisma.post.update({
    where: { id: post.id },
    data: { coverImage: `/api/thumbnail/${post.id}` },
  });

  await prisma.signalItem.updateMany({
    where: { id: { in: topItems.map((i) => i.id) } },
    data: { usedInPost: post.id },
  });

  if (validation.passed) {
    try {
      revalidatePath("/");
      revalidatePath("/signal");
    } catch {
      console.error("Revalidation failed");
    }
  }

  console.log(`Generated Claude post: ${post.id} (${topItems.length} items, validation: ${validation.passed ? "PASS" : "FAIL"} score=${validation.score})`);

  return { postId: post.id, skipped: false };
};
