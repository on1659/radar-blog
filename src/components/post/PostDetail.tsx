import { Badge } from "@/components/ui/Badge";
import type { Category } from "@/types";

interface PostDetailHeaderProps {
  category: Category;
  title: string;
  subtitle?: string;
  createdAt: string;
  readingTime: number;
  viewCount?: number;
}

export const PostDetailHeader = ({
  category,
  title,
  subtitle,
  createdAt,
  readingTime,
  viewCount,
}: PostDetailHeaderProps) => {
  const d = new Date(createdAt);
  const dateStr = d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });

  return (
    <header className="mx-auto max-w-[1000px] px-5 sm:px-8 pt-14">
      <div className="mb-5 flex gap-2">
        <Badge category={category} />
      </div>
      <h1 className="mb-3 text-page-title tracking-[-0.03em]">{title}</h1>
      {subtitle && (
        <p className="mb-7 text-[1.125rem] leading-[1.55] text-text-secondary">
          {subtitle}
        </p>
      )}
      <div className="flex items-center gap-3 border-b border-border pb-8 text-sm text-text-tertiary">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3182F6] to-[#8B5CF6] text-xs font-bold text-white">
          R
        </div>
        <div className="leading-[1.4]">
          <div className="text-[0.9375rem] font-semibold text-text-primary">
            이더
          </div>
          <div className="flex items-center gap-1.5">
            {dateStr} · {readingTime} min read
            {viewCount !== undefined && (
              <>
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {viewCount.toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
