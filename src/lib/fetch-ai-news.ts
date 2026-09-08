import Parser from "rss-parser";
import {
  type RawSignalItem,
  type SourceType,
  matchesKeyword,
  REDDIT_SUBS,
  RSS_FEEDS,
  CLAUDE_RSS_FEEDS,
  CLAUDE_KEYWORDS,
  MAX_ITEMS_PER_SOURCE,
  SLOT_CONFIG,
  TOTAL_SLOTS,
} from "./signal-sources";
import { makeExternalId, extractCanonicalUrl } from "./normalize-url";

/* ───── 동시성 제한 유틸 ───── */

const pLimit = (concurrency: number) => {
  let active = 0;
  const queue: (() => void)[] = [];
  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      const run = async () => {
        active++;
        try { resolve(await fn()); }
        catch (e) { reject(e); }
        finally {
          active--;
          if (queue.length > 0) queue.shift()!();
        }
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
};

/* ───── 1. Hacker News (Firebase API) ───── */

const fetchHackerNews = async (): Promise<RawSignalItem[]> => {
  const limit = pLimit(10);
  try {
    const [topRes, bestRes] = await Promise.all([
      fetch("https://hacker-news.firebaseio.com/v0/topstories.json"),
      fetch("https://hacker-news.firebaseio.com/v0/beststories.json"),
    ]);

    const topIds: number[] = await topRes.json();
    const bestIds: number[] = await bestRes.json();
    const uniqueIds = [...new Set([...topIds.slice(0, 30), ...bestIds.slice(0, 30)])];

    const items = await Promise.all(
      uniqueIds.map((id) =>
        limit(async () => {
          const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          return res.json();
        })
      )
    );

    return items
      .filter((item) => item && !item.dead && !item.deleted && item.title && matchesKeyword(item.title))
      .map((item) => {
        const url = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
        return {
          externalId: makeExternalId("hacker-news", url),
          canonicalUrl: extractCanonicalUrl(url, "Hacker News"),
          source: "Hacker News",
          sourceType: "community" as SourceType,
          title: item.title,
          url,
          score: item.score ?? 0,
          createdAt: new Date((item.time ?? 0) * 1000).toISOString(),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ITEMS_PER_SOURCE);
  } catch (e) {
    console.error("HackerNews fetch failed:", e);
    return [];
  }
};

/* ───── 2. Reddit (공개 JSON API) ───── */

const fetchReddit = async (): Promise<RawSignalItem[]> => {
  const results: RawSignalItem[] = [];

  for (const sub of REDDIT_SUBS) {
    try {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=20`, {
        headers: { "User-Agent": "ai-trend-collector/1.0" },
      });

      if (!res.ok) continue;

      const data = await res.json();
      const posts = data?.data?.children ?? [];

      for (const { data: post } of posts) {
        if (post.stickied || post.score <= 10) continue;

        const url = post.url?.startsWith("https://www.reddit.com")
          ? `https://www.reddit.com${post.permalink}`
          : post.url || `https://www.reddit.com${post.permalink}`;

        results.push({
          externalId: makeExternalId(`reddit-${sub}`, url),
          canonicalUrl: extractCanonicalUrl(url, `Reddit r/${sub}`),
          source: `Reddit r/${sub}`,
          sourceType: "community",
          title: post.title,
          url,
          score: post.score,
          createdAt: new Date(post.created_utc * 1000).toISOString(),
          summary: post.selftext?.slice(0, 300) || undefined,
        });
      }
    } catch (e) {
      console.error(`Reddit r/${sub} fetch failed:`, e);
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, MAX_ITEMS_PER_SOURCE);
};

/* ───── 3. HuggingFace Daily Papers ───── */

const fetchHuggingFacePapers = async (): Promise<RawSignalItem[]> => {
  try {
    const res = await fetch("https://huggingface.co/api/daily_papers");
    if (!res.ok) return [];

    const papers: Array<{
      title: string;
      paper: { id: string; title: string; summary?: string; publishedAt?: string };
      upvotes?: number;
      publishedAt?: string;
    }> = await res.json();

    return papers
      .slice(0, MAX_ITEMS_PER_SOURCE)
      .map((p) => {
        const url = `https://huggingface.co/papers/${p.paper?.id}`;
        return {
          externalId: makeExternalId("huggingface", url),
          canonicalUrl: extractCanonicalUrl(url, "HuggingFace Papers"),
          source: "HuggingFace Papers",
          sourceType: "research" as SourceType,
          title: p.paper?.title ?? p.title,
          url,
          score: p.upvotes ?? 0,
          createdAt: p.publishedAt ?? new Date().toISOString(),
          summary: p.paper?.summary?.slice(0, 500) || undefined,
        };
      });
  } catch (e) {
    console.error("HuggingFace Papers fetch failed:", e);
    return [];
  }
};

/* ───── 4. GitHub Trending ───── */

const fetchGitHubTrending = async (): Promise<RawSignalItem[]> => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const query = encodeURIComponent(`topic:ai topic:machine-learning topic:llm created:>${weekAgo}`);

    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(
      `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=${MAX_ITEMS_PER_SOURCE}`,
      { headers }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const repos = data.items ?? [];

    return repos.map((repo: {
      full_name: string;
      description: string;
      html_url: string;
      stargazers_count: number;
      created_at: string;
      topics?: string[];
    }) => {
      const url = repo.html_url;
      return {
        externalId: makeExternalId("github", url),
        canonicalUrl: extractCanonicalUrl(url, "GitHub Trending"),
        source: "GitHub Trending",
        sourceType: "research" as SourceType,
        title: `${repo.full_name} — ${repo.description ?? ""}`.slice(0, 200),
        url,
        score: repo.stargazers_count,
        createdAt: repo.created_at,
        summary: repo.topics?.slice(0, 5).join(", ") || undefined,
      };
    });
  } catch (e) {
    console.error("GitHub Trending fetch failed:", e);
    return [];
  }
};

/* ───── 5. Anthropic News (HTML 스크래핑) ───── */

interface AnthropicArticle {
  title: string;
  slug: string;
  summary?: string;
  publishedOn: string;
}

/**
 * Anthropic 뉴스 스크래퍼
 * anthropic.com/news의 인라인 JSON에서 기사 추출
 * 실제 HTML 이스케이프 패턴: publishedOn\":\"ISO\", slug\":{\"_type\":\"slug\",\"current\":\"xxx\"}
 */
const fetchAnthropicNews = async (): Promise<RawSignalItem[]> => {
  try {
    const res = await fetch("https://www.anthropic.com/news", {
      headers: { "User-Agent": "ai-trend-collector/1.0" },
    });
    if (!res.ok) {
      console.error(`Anthropic News fetch failed: ${res.status}`);
      return [];
    }

    const html = await res.text();

    // 이스케이프된 slug에서 직접 추출: current\":\"slug-name
    const slugPattern = /current\\":\\"([a-z0-9-]+)/g;
    const slugs: string[] = [];
    let slugMatch;
    while ((slugMatch = slugPattern.exec(html)) !== null) {
      if (!slugs.includes(slugMatch[1])) slugs.push(slugMatch[1]);
    }

    // 이스케이프된 publishedOn 추출: publishedOn\":\"2026-03-12T14:39:00.000Z
    const pubPattern = /publishedOn\\":\\"(\d{4}-\d{2}-\d{2}T[^\\]+)/g;
    const dates: string[] = [];
    let pubMatch;
    while ((pubMatch = pubPattern.exec(html)) !== null) {
      dates.push(pubMatch[1]);
    }

    // 이스케이프된 title 추출 — slug 근처에서 title 찾기
    // 전체 HTML에서 slug 위치 기반으로 청크 추출 후 매칭
    const articles: AnthropicArticle[] = [];
    const seen = new Set<string>();

    for (const slug of slugs) {
      const slugIdx = html.indexOf(`current\\":\\"${slug}\\"`);
      if (slugIdx === -1) continue;

      // slug 주변 2000자에서 publishedOn, title 추출
      const start = Math.max(0, slugIdx - 1000);
      const end = Math.min(html.length, slugIdx + 1000);
      const chunk = html.slice(start, end);

      const datM = chunk.match(/publishedOn\\":\\"(\d{4}-\d{2}-\d{2}T[^\\]+)/);
      const titleM = chunk.match(/title\\":\\"([^\\]{5,200})/);

      if (datM && titleM && !seen.has(slug)) {
        seen.add(slug);
        articles.push({
          publishedOn: datM[1],
          slug,
          title: titleM[1],
          summary: undefined,
        });
      }
    }

    // title이 없는 경우를 위한 폴백: publishedOn 기준 매칭
    if (articles.length === 0 && dates.length > 0 && slugs.length > 0) {
      console.warn(`[Anthropic News] Slug-based extraction failed, trying positional fallback`);
      const count = Math.min(dates.length, slugs.length);
      for (let i = 0; i < count; i++) {
        if (!seen.has(slugs[i])) {
          seen.add(slugs[i]);
          // slug를 제목으로 사용 (kebab → Title Case)
          const title = slugs[i].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          articles.push({
            publishedOn: dates[i],
            slug: slugs[i],
            title,
            summary: undefined,
          });
        }
      }
    }

    console.log(`[Anthropic News] Found ${articles.length} articles`);

    // 30일 이내 기사
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return articles
      .filter((a) => new Date(a.publishedOn).getTime() >= cutoff)
      .slice(0, MAX_ITEMS_PER_SOURCE)
      .map((a) => {
        const url = `https://www.anthropic.com/news/${a.slug}`;
        const ageHours = (Date.now() - new Date(a.publishedOn).getTime()) / (1000 * 60 * 60);
        const recencyScore = ageHours <= 24 ? 200 : ageHours <= 48 ? 150 : ageHours <= 168 ? 100 : 50;

        return {
          externalId: makeExternalId("anthropic-news", url),
          canonicalUrl: extractCanonicalUrl(url, "Anthropic News"),
          source: "Anthropic News",
          sourceType: "industry" as SourceType,
          title: a.title,
          url,
          score: recencyScore,
          createdAt: a.publishedOn,
          summary: a.summary?.slice(0, 500) || undefined,
        };
      });
  } catch (e) {
    console.error("Anthropic News fetch failed:", e);
    return [];
  }
};

/* ───── 6. RSS Feeds ───── */

const fetchRSSFeeds = async (): Promise<RawSignalItem[]> => {
  const parser = new Parser({ timeout: 10000 });

  let customFeeds: { name: string; url: string }[] = [];
  try {
    if (process.env.CUSTOM_RSS) {
      customFeeds = JSON.parse(process.env.CUSTOM_RSS);
    }
  } catch {
    console.error("Failed to parse CUSTOM_RSS env var");
  }

  const allFeeds = [...RSS_FEEDS, ...customFeeds];

  // 병렬 수집 (Promise.allSettled로 실패 격리)
  const feedResults = await Promise.allSettled(
    allFeeds.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return { feed, items: parsed.items ?? [] };
    })
  );

  const results: RawSignalItem[] = [];

  for (const result of feedResults) {
    if (result.status === "rejected") {
      console.error("RSS feed fetch failed:", result.reason);
      continue;
    }

    const { feed, items } = result.value;

    for (const item of items.slice(0, 5)) {
      // pubDate 없으면 건너뜀 (fallback으로 현재시각 사용 금지)
      const pubDate = item.isoDate ?? item.pubDate;
      if (!pubDate) continue;

      const url = item.link ?? "";
      if (!url) continue;

      // RSS는 업보트 점수가 없으므로 최신성 기반 점수 부여
      // 24h 이내 = 100, 48h = 50, 그 이상 = 10
      const ageHours = (Date.now() - new Date(pubDate).getTime()) / (1000 * 60 * 60);
      const recencyScore = ageHours <= 24 ? 100 : ageHours <= 48 ? 50 : 10;

      results.push({
        externalId: makeExternalId(`rss-${feed.name}`, url),
        canonicalUrl: extractCanonicalUrl(url, `RSS: ${feed.name}`),
        source: `RSS: ${feed.name}`,
        sourceType: "industry",
        title: item.title ?? "Untitled",
        url,
        score: recencyScore,
        createdAt: pubDate,
        summary: item.contentSnippet?.slice(0, 500) || undefined,
      });
    }
  }

  return results;
};

/* ───── 슬롯제 선별 ───── */

const selectBySlots = (items: RawSignalItem[]): RawSignalItem[] => {
  const byType: Record<SourceType, RawSignalItem[]> = {
    community: [],
    research: [],
    industry: [],
  };

  for (const item of items) {
    byType[item.sourceType]?.push(item);
  }

  // community/research: score 내림차순, industry: 발행시각 최신순
  byType.community.sort((a, b) => b.score - a.score);
  byType.research.sort((a, b) => b.score - a.score);
  byType.industry.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const selected: RawSignalItem[] = [];
  const remaining: RawSignalItem[] = [];

  for (const type of ["community", "research", "industry"] as SourceType[]) {
    const slot = SLOT_CONFIG[type];
    const pool = byType[type];
    selected.push(...pool.slice(0, slot));
    remaining.push(...pool.slice(slot));
  }

  // 슬롯 부족 시 다른 유형에서 채우기
  if (selected.length < TOTAL_SLOTS) {
    remaining.sort((a, b) => b.score - a.score);
    const needed = TOTAL_SLOTS - selected.length;
    selected.push(...remaining.slice(0, needed));
  }

  return selected;
};

/* ───── canonicalUrl 기반 dedup ───── */

const dedup = (items: RawSignalItem[]): RawSignalItem[] => {
  const seen = new Map<string, RawSignalItem>();

  for (const item of items) {
    const key = item.canonicalUrl ?? item.externalId;
    const existing = seen.get(key);
    if (!existing || item.score > existing.score) {
      seen.set(key, item);
    }
  }

  return [...seen.values()];
};

/* ───── 7. Claude/Anthropic 전용 RSS ───── */

const fetchClaudeRSS = async (): Promise<RawSignalItem[]> => {
  const parser = new Parser({ timeout: 10000 });
  const results: RawSignalItem[] = [];

  const feedResults = await Promise.allSettled(
    CLAUDE_RSS_FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return { feed, items: parsed.items ?? [] };
    })
  );

  for (const result of feedResults) {
    if (result.status === "rejected") {
      console.error("Claude RSS fetch failed:", result.reason);
      continue;
    }
    const { feed, items } = result.value;
    for (const item of items.slice(0, 10)) {
      const pubDate = item.isoDate ?? item.pubDate;
      if (!pubDate) continue;
      const url = item.link ?? "";
      if (!url) continue;

      const ageHours = (Date.now() - new Date(pubDate).getTime()) / (1000 * 60 * 60);
      const recencyScore = ageHours <= 24 ? 200 : ageHours <= 48 ? 150 : ageHours <= 168 ? 100 : 50;

      results.push({
        externalId: makeExternalId(`claude-rss-${feed.name}`, url),
        canonicalUrl: extractCanonicalUrl(url, `Claude: ${feed.name}`),
        source: `Claude: ${feed.name}`,
        sourceType: "industry",
        title: item.title ?? "Untitled",
        url,
        score: recencyScore,
        createdAt: pubDate,
        summary: item.contentSnippet?.slice(0, 500) || undefined,
      });
    }
  }

  return results;
};

/* ───── Claude 키워드 매칭 (일반 소스에서 Claude 관련 필터) ───── */

const matchesClaudeKeyword = (text: string): boolean => {
  const lower = text.toLowerCase();
  return CLAUDE_KEYWORDS.some((kw) => lower.includes(kw));
};

/* ───── 메인: 전체 소스 병렬 수집 ───── */

export const fetchAINews = async (): Promise<RawSignalItem[]> => {
  const [hn, reddit, hf, github, rss, anthropic] = await Promise.all([
    fetchHackerNews(),
    fetchReddit(),
    fetchHuggingFacePapers(),
    fetchGitHubTrending(),
    fetchRSSFeeds(),
    fetchAnthropicNews(),
  ]);

  const all = [...hn, ...reddit, ...hf, ...github, ...rss, ...anthropic];

  console.log(
    `[AI News] Collected: HN=${hn.length}, Reddit=${reddit.length}, HF=${hf.length}, GitHub=${github.length}, RSS=${rss.length}, Anthropic=${anthropic.length}, Total=${all.length}`
  );

  // canonicalUrl 기반 cross-source dedup
  const deduped = dedup(all);
  console.log(`[AI News] After dedup: ${deduped.length} (removed ${all.length - deduped.length} duplicates)`);

  // 슬롯제 선별
  const selected = selectBySlots(deduped);
  console.log(
    `[AI News] Selected ${selected.length} items: ` +
    `community=${selected.filter((i) => i.sourceType === "community").length}, ` +
    `research=${selected.filter((i) => i.sourceType === "research").length}, ` +
    `industry=${selected.filter((i) => i.sourceType === "industry").length}`
  );

  return selected;
};

/* ───── Claude 전용 수집: Anthropic 소스 + 일반 소스에서 Claude 관련 필터 ───── */

export const fetchClaudeNews = async (): Promise<RawSignalItem[]> => {
  const [anthropic, claudeRss, hn, reddit, rss] = await Promise.all([
    fetchAnthropicNews(),
    fetchClaudeRSS(),
    fetchHackerNews(),
    fetchReddit(),
    fetchRSSFeeds(),
  ]);

  // Anthropic 공식 소스는 전부 포함, Claude RSS(Simon Willison 전체 피드)는 키워드 필터 적용
  const filteredClaudeRss = claudeRss.filter(
    (item) => matchesClaudeKeyword(item.title) || (item.summary && matchesClaudeKeyword(item.summary))
  );
  const dedicated = [...anthropic, ...filteredClaudeRss];

  // 일반 소스에서 Claude/Anthropic 관련만 필터
  const generalClaude = [...hn, ...reddit, ...rss].filter(
    (item) => matchesClaudeKeyword(item.title) || (item.summary && matchesClaudeKeyword(item.summary))
  );

  const all = [...dedicated, ...generalClaude];
  const deduped = dedup(all);

  console.log(
    `[Claude News] Collected: Anthropic=${anthropic.length}, ClaudeRSS=${filteredClaudeRss.length}/${claudeRss.length}, ` +
    `GeneralClaude=${generalClaude.length}, Total=${all.length}, After dedup=${deduped.length}`
  );

  // 점수 내림차순, 최대 10개
  return deduped.sort((a, b) => b.score - a.score).slice(0, 10);
};
