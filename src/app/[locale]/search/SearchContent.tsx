"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import Fuse from "fuse.js";
import { PostItem } from "@/components/post/PostItem";
import type { PostMeta } from "@/types";

const RECENT_KEY = "radar-recent-searches";
const MAX_RECENT = 5;

const getRecentSearches = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch { return []; }
};

const saveRecentSearch = (query: string) => {
  const recent = getRecentSearches().filter((q) => q !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

const clearRecentSearches = () => {
  localStorage.removeItem(RECENT_KEY);
};

export const SearchContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch("/api/v1/posts?published=true&limit=200");
        const data = await res.json();
        if (data.success) {
          setPosts(data.data);
          // 인기 태그 계산
          const tagCounts: Record<string, number> = {};
          for (const post of data.data as PostMeta[]) {
            for (const tag of post.tags) {
              tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            }
          }
          const sorted = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([tag, count]) => ({ tag, count }));
          setPopularTags(sorted);
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetchPosts();
  }, []);

  const fuse = useMemo(
    () => new Fuse(posts, {
      keys: ["title", "excerpt", "tags"],
      threshold: 0.3,
      includeScore: true,
      includeMatches: true,
    }),
    [posts]
  );

  const results = query ? fuse.search(query).map((r) => r.item) : [];

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim()) {
      saveRecentSearch(q.trim());
      setRecentSearches(getRecentSearches());
    }
  }, []);

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  return (
    <div className="mx-auto max-w-container px-8 pb-16 pt-12">
      {/* Search Input */}
      <div className="relative mb-6">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="검색어를 입력하세요..."
          autoFocus
          className="w-full rounded-xl border border-border bg-bg-primary px-4 py-3 pl-12 text-body text-text-primary outline-none transition-all duration-base placeholder:text-text-muted focus:border-brand-primary"
        />
        {query && (
          <button onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        )}
      </div>

      {/* No query — show recent searches + popular tags */}
      {!query && !loading && (
        <div className="space-y-8">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-card-desc font-semibold">
                  <Clock size={15} /> 최근 검색어
                </h3>
                <button onClick={handleClearRecent} className="text-meta text-text-muted hover:text-text-primary">
                  전체 삭제
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((q) => (
                  <button key={q} onClick={() => handleSearch(q)}
                    className="rounded-full border border-border px-3 py-1.5 text-meta text-text-secondary transition-all hover:border-brand-primary hover:text-brand-primary">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Tags */}
          {popularTags.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-1.5 text-card-desc font-semibold">
                <TrendingUp size={15} /> 인기 태그
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularTags.map(({ tag, count }) => (
                  <button key={tag}
                    onClick={() => router.push(`/tag/${encodeURIComponent(tag)}`)}
                    className="rounded-full border border-border px-3 py-1.5 text-meta text-text-secondary transition-all hover:border-brand-primary hover:text-brand-primary">
                    #{tag} <span className="ml-1 text-text-muted">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Results */}
      {query && (
        <>
          {loading ? (
            <p className="text-center text-text-tertiary">로딩 중...</p>
          ) : results.length === 0 ? (
            <p className="text-center text-text-tertiary">
              &quot;{query}&quot;에 대한 검색 결과가 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-px">
              <p className="mb-4 text-card-desc text-text-secondary">
                {results.length}개의 검색 결과
              </p>
              {results.map((post) => (
                <PostItem key={post.id} post={post} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
