import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { PostMeta } from "@/types";

const gradientMap = {
  commits: "from-[#0D503B] to-[#00C471]",
  articles: "from-[#1A3A6B] to-[#3182F6]",
  techlab: "from-[#3B1A6E] to-[#8B5CF6]",
  casual: "from-[#6B2A10] to-[#FF6B35]",
  daily: "from-[#134E5E] to-[#06B6D4]",
} as const;

const getRelativeTime = (dateStr: string, locale: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const isKo = locale !== "en";

  if (diffMin < 1) return isKo ? "방금 전" : "just now";
  if (diffMin < 60) return isKo ? `${diffMin}분 전` : `${diffMin}m ago`;
  if (diffHour < 24) return isKo ? `${diffHour}시간 전` : `${diffHour}h ago`;
  if (diffDay < 7) return isKo ? `${diffDay}일 전` : `${diffDay}d ago`;
  if (diffWeek < 5) return isKo ? `${diffWeek}주 전` : `${diffWeek}w ago`;
  if (diffMonth < 12) return isKo ? `${diffMonth}개월 전` : `${diffMonth}mo ago`;
  return isKo ? `${diffYear}년 전` : `${diffYear}y ago`;
};

export const PostItem = ({ post, locale = "ko" }: { post: PostMeta; locale?: string }) => {
  const gradient = gradientMap[post.category];
  const isEn = locale === "en" && post.hasEnglish;
  const title = isEn && post.titleEn ? post.titleEn : post.title;
  const excerpt = isEn && post.excerptEn ? post.excerptEn : post.excerpt;

  return (
    <Link
      href={`/post/${post.slug}`}
      className="group flex flex-col gap-4 border-b border-border-light py-7 transition-all duration-base last:border-b-0 hover:mx-[-16px] hover:rounded-xl hover:bg-card-hover hover:px-4 md:flex-row md:gap-7"
    >
      {/* Thumbnail */}
      <div className="h-[180px] w-full flex-shrink-0 overflow-hidden rounded-xl md:h-[130px] md:w-[200px]">
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={`flex h-full w-full items-end bg-gradient-to-br p-3 ${gradient}`}
          >
            <span className="font-code text-xs text-white/60">
              {post.repoName || post.category}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="mb-2 flex items-center gap-2">
          <Badge category={post.category} />
          {post.commitHash && (
            <span className="font-code text-xs font-medium text-text-muted">
              {post.repoName} · {post.commitHash.slice(0, 7)}
            </span>
          )}
        </div>
        <h3 className="mb-1.5 line-clamp-2 text-card-title tracking-[-0.01em]">
          {title}
        </h3>
        <p className="mb-3 line-clamp-2 text-card-desc text-text-secondary">
          {excerpt}
        </p>
        <div className="flex items-center gap-2 text-meta text-text-tertiary">
          <span>{locale === "en" ? "Ether" : "이더"}</span>
          <span className="h-0.5 w-0.5 flex-shrink-0 rounded-full bg-text-muted" />
          {/* 시계 아이콘 + 상대 시간 */}
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {getRelativeTime(post.createdAt, locale)}
          </span>
          <span className="h-0.5 w-0.5 flex-shrink-0 rounded-full bg-text-muted" />
          <span>{post.readingTime} min read</span>
          {/* 눈 아이콘 + 조회수 */}
          {post.viewCount !== undefined && (
            <>
              <span className="h-0.5 w-0.5 flex-shrink-0 rounded-full bg-text-muted" />
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {post.viewCount.toLocaleString()}
              </span>
            </>
          )}
          {post.tags.length > 0 && (
            <div className="ml-auto flex gap-1.5">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-bg-secondary px-2 py-0.5 text-[0.6875rem] font-medium text-text-tertiary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
