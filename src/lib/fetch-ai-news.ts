import Parser from "rss-parser";
import {
  type RawSignalItem,
  type SourceType,
  matchesKeyword,
  REDDIT_SUBS,
  RSS_FEEDS,
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

/* ───── 5. RSS Feeds ───── */

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

/* ───── 메인: 전체 소스 병렬 수집 ───── */

export const fetchAINews = async (): Promise<RawSignalItem[]> => {
  const [hn, reddit, hf, github, rss] = await Promise.all([
    fetchHackerNews(),
    fetchReddit(),
    fetchHuggingFacePapers(),
    fetchGitHubTrending(),
    fetchRSSFeeds(),
  ]);

  const all = [...hn, ...reddit, ...hf, ...github, ...rss];

  console.log(
    `[AI News] Collected: HN=${hn.length}, Reddit=${reddit.length}, HF=${hf.length}, GitHub=${github.length}, RSS=${rss.length}, Total=${all.length}`
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
