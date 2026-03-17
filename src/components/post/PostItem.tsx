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

export const PostItem = ({ post, locale = "ko" }: { post: PostMeta; locale?: string }) => {
  const gradient = gradientMap[post.category];
  const isEn = locale === "en" && post.hasEnglish;
  const title = isEn && post.titleEn ? post.titleEn : post.title;
  const excerpt = isEn && post.excerptEn ? post.excerptEn : post.excerpt;
  const dateLocale = locale === "en" ? "en-US" : "ko-KR";

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
          <span>{locale === "en"
            ? new Date(post.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
            : new Date(post.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "")
          }</span>
          <span className="h-0.5 w-0.5 flex-shrink-0 rounded-full bg-text-muted" />
          <span>{post.readingTime} min read</span>
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
