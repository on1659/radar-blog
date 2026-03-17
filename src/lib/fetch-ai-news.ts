import Parser from "rss-parser";

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  score: number;
  createdAt: string;
  summary?: string;
}

/* ───── 설정 ───── */

const AI_KEYWORDS = (process.env.AI_KEYWORDS ?? "AI,LLM,GPT,Claude,Anthropic,OpenAI,Gemini,agent,RAG,transformer,fine-tuning")
  .split(",")
  .map((k) => k.trim().toLowerCase());

const MAX_ITEMS = Number(process.env.MAX_NEWS_ITEMS ?? "10");

const REDDIT_SUBS = (process.env.REDDIT_SUBS ?? "MachineLearning,LocalLLaMA,artificial").split(",");

const DEFAULT_RSS_FEEDS = [
  { name: "TLDR AI", url: "https://tldr.tech/ai/rss" },
  { name: "MIT Tech Review AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed" },
];

const matchesKeyword = (text: string): boolean => {
  const lower = text.toLowerCase();
  return AI_KEYWORDS.some((kw) => lower.includes(kw));
};

/* ───── 1. Hacker News (Firebase API) ───── */

const fetchHackerNews = async (): Promise<NewsItem[]> => {
  try {
    const [topRes, bestRes] = await Promise.all([
      fetch("https://hacker-news.firebaseio.com/v0/topstories.json"),
      fetch("https://hacker-news.firebaseio.com/v0/beststories.json"),
    ]);

    const topIds: number[] = await topRes.json();
    const bestIds: number[] = await bestRes.json();

    const uniqueIds = [...new Set([...topIds.slice(0, 30), ...bestIds.slice(0, 30)])];

    const items = await Promise.all(
      uniqueIds.map(async (id) => {
        const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return res.json();
      })
    );

    return items
      .filter((item) => item && !item.dead && !item.deleted && item.title && matchesKeyword(item.title))
      .map((item) => ({
        title: item.title,
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        source: "Hacker News",
        score: item.score ?? 0,
        createdAt: new Date((item.time ?? 0) * 1000).toISOString(),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ITEMS);
  } catch (e) {
    console.error("HackerNews fetch failed:", e);
    return [];
  }
};

/* ───── 2. Reddit (공개 JSON API) ───── */

const fetchReddit = async (): Promise<NewsItem[]> => {
  const results: NewsItem[] = [];

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

        results.push({
          title: post.title,
          url: post.url?.startsWith("https://www.reddit.com")
            ? `https://www.reddit.com${post.permalink}`
            : post.url || `https://www.reddit.com${post.permalink}`,
          source: `Reddit r/${sub}`,
          score: post.score,
          createdAt: new Date(post.created_utc * 1000).toISOString(),
          summary: post.selftext?.slice(0, 300) || undefined,
        });
      }
    } catch (e) {
      console.error(`Reddit r/${sub} fetch failed:`, e);
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, MAX_ITEMS);
};

/* ───── 3. HuggingFace Daily Papers ───── */

const fetchHuggingFacePapers = async (): Promise<NewsItem[]> => {
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
      .slice(0, MAX_ITEMS)
      .map((p) => ({
        title: p.paper?.title ?? p.title,
        url: `https://huggingface.co/papers/${p.paper?.id}`,
        source: "HuggingFace Papers",
        score: p.upvotes ?? 0,
        createdAt: p.publishedAt ?? new Date().toISOString(),
        summary: p.paper?.summary?.slice(0, 500) || undefined,
      }));
  } catch (e) {
    console.error("HuggingFace Papers fetch failed:", e);
    return [];
  }
};

/* ───── 4. GitHub Trending ───── */

const fetchGitHubTrending = async (): Promise<NewsItem[]> => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const query = encodeURIComponent(`topic:ai topic:machine-learning topic:llm created:>${weekAgo}`);

    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(
      `https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=${MAX_ITEMS}`,
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
      language?: string;
    }) => ({
      title: `${repo.full_name} — ${repo.description ?? ""}`.slice(0, 200),
      url: repo.html_url,
      source: "GitHub Trending",
      score: repo.stargazers_count,
      createdAt: repo.created_at,
      summary: repo.topics?.slice(0, 5).join(", ") || undefined,
    }));
  } catch (e) {
    console.error("GitHub Trending fetch failed:", e);
    return [];
  }
};

/* ───── 5. RSS Feeds ───── */

const fetchRSSFeeds = async (): Promise<NewsItem[]> => {
  const parser = new Parser({ timeout: 10000 });
  const results: NewsItem[] = [];

  let customFeeds: { name: string; url: string }[] = [];
  try {
    if (process.env.CUSTOM_RSS) {
      customFeeds = JSON.parse(process.env.CUSTOM_RSS);
    }
  } catch {
    console.error("Failed to parse CUSTOM_RSS env var");
  }

  const allFeeds = [...DEFAULT_RSS_FEEDS, ...customFeeds];

  for (const feed of allFeeds) {
    try {
      const parsed = await parser.parseURL(feed.url);

      for (const item of (parsed.items ?? []).slice(0, 5)) {
        results.push({
          title: item.title ?? "Untitled",
          url: item.link ?? "",
          source: `RSS: ${feed.name}`,
          score: 0,
          createdAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
          summary: item.contentSnippet?.slice(0, 500) || undefined,
        });
      }
    } catch (e) {
      console.error(`RSS ${feed.name} fetch failed:`, e);
    }
  }

  return results.slice(0, MAX_ITEMS);
};

/* ───── 메인: 전체 소스 병렬 수집 ───── */

export const fetchAINews = async (): Promise<NewsItem[]> => {
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

  // 점수 기반 정렬 (RSS는 score=0이라 뒤로 감)
  return all.sort((a, b) => b.score - a.score);
};
