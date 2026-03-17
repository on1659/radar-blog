export interface NewsItem {
  title: string;
  url: string;
  source: string;
  points: number;
  createdAt: string;
}

const HN_API = "https://hn.algolia.com/api/v1/search_by_date";

const AI_KEYWORDS = [
  "Claude",
  "Anthropic",
  "GPT",
  "OpenAI",
  "Gemini",
  "LLM",
  "AI model",
  "machine learning",
];

export const fetchAINews = async (
  sinceHoursAgo = 6
): Promise<NewsItem[]> => {
  const since = Math.floor(Date.now() / 1000) - sinceHoursAgo * 3600;
  const query = AI_KEYWORDS.slice(0, 4).join(" OR ");

  const params = new URLSearchParams({
    query,
    tags: "story",
    numericFilters: `created_at_i>${since},points>5`,
    hitsPerPage: "20",
  });

  const res = await fetch(`${HN_API}?${params}`, {
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`HN API error: ${res.status}`);
  }

  const data = await res.json();
  const hits = data.hits as Array<{
    title: string;
    url: string;
    story_url?: string;
    points: number;
    created_at: string;
    objectID: string;
  }>;

  return hits
    .filter((h) => h.url || h.story_url)
    .map((h) => ({
      title: h.title,
      url: h.url || h.story_url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: "hackernews",
      points: h.points,
      createdAt: h.created_at,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);
};
