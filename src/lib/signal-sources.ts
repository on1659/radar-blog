/**
 * AI Signal 소스 카탈로그 및 타입 정의
 */

/* ───── 타입 ───── */

export type SourceType = "community" | "research" | "industry";

export interface RawSignalItem {
  externalId: string;
  canonicalUrl: string | null;
  source: string;
  sourceType: SourceType;
  title: string;
  url: string;
  score: number;
  createdAt: string;
  summary?: string;
}

/* ───── 슬롯 설정 ───── */

export const SLOT_CONFIG: Record<SourceType, number> = {
  community: 6,  // HN + Reddit
  research: 5,   // HF Papers + GitHub Trending
  industry: 4,   // 기업블로그 RSS
};

export const TOTAL_SLOTS = Object.values(SLOT_CONFIG).reduce((a, b) => a + b, 0); // 15

/* ───── RSS 소스 목록 ───── */

export const RSS_FEEDS = [
  // 기존
  { name: "TLDR", url: "https://tldr.tech/rss" },
  { name: "MIT Tech Review AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed" },
  // 신규 (P1)
  { name: "Google AI Blog", url: "http://googleaiblog.blogspot.com/atom.xml" },
  { name: "HuggingFace Blog", url: "https://huggingface.co/blog/feed.xml" },
  { name: "Simon Willison", url: "https://simonwillison.net/atom/everything/" },
  // 공식 AI 기업 블로그
  { name: "Google DeepMind", url: "https://deepmind.google/blog/rss.xml" },
  { name: "OpenAI Blog", url: "https://openai.com/blog/rss.xml" },
  // Note: Anthropic — RSS 미제공, fetch-ai-news.ts에서 HTML 스크래핑으로 수집
];

/* ───── Claude/Anthropic 전용 소스 ───── */

export const CLAUDE_RSS_FEEDS = [
  // Anthropic은 공식 RSS 미제공 — 대신 Claude 관련 일반 RSS 활용
  { name: "Simon Willison Claude", url: "https://simonwillison.net/atom/everything/" },
  { name: "Ars Technica AI", url: "https://feeds.arstechnica.com/arstechnica/technology-lab" },
  { name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
];

// mcp/model context protocol/artifacts/rlhf는 제외: claude/anthropic과 같이 안 나오면
// 무관 기사(ChatGPT, 일반 보안 기사 등)도 통과시키는 범용어이고, 같이 나오는 경우엔 어차피
// "claude"/"anthropic" 키워드가 매칭되므로 참 긍정에 기여하지 않고 거짓 긍정만 늘림.
export const CLAUDE_KEYWORDS = [
  "claude", "anthropic", "claude code", "claude sonnet", "claude opus",
  "claude haiku", "claude api", "claude desktop", "claude mobile",
  "constitutional ai", "claude 4", "claude 3",
];

/* ───── AI 키워드 필터 ───── */

export const AI_KEYWORDS = (process.env.AI_KEYWORDS ?? "AI,LLM,GPT,Claude,Anthropic,OpenAI,Gemini,agent,RAG,transformer,fine-tuning")
  .split(",")
  .map((k) => k.trim().toLowerCase());

export const matchesKeyword = (text: string): boolean => {
  const lower = text.toLowerCase();
  return AI_KEYWORDS.some((kw) => lower.includes(kw));
};

/* ───── Reddit 서브레딧 ───── */

export const REDDIT_SUBS = (process.env.REDDIT_SUBS ?? "MachineLearning,LocalLLaMA,artificial")
  .split(",")
  .map((s) => s.trim());

export const MAX_ITEMS_PER_SOURCE = Number(process.env.MAX_NEWS_ITEMS ?? "10");
