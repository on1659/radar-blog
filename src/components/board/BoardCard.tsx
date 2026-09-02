import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { getRelativeTime } from "@/lib/relative-time";
import type { BoardCategoryKey, BoardPostMeta, CommunityDict } from "@/types";

/** 카테고리 식별은 풀컬러 배지가 아니라 작은 도트 + 중립 라벨로 (절제) */
export const BOARD_CATEGORY_DOTS: Record<BoardCategoryKey, string> = {
  showcase: "bg-board-accent",
  chat: "bg-[#F59E0B]",
  question: "bg-[#22D3EE]",
};

export const boardCategoryLabel = (dict: CommunityDict, key: BoardCategoryKey): string =>
  key === "showcase"
    ? dict.categoryShowcase
    : key === "chat"
      ? dict.categoryChat
      : dict.categoryQuestion;

export const BoardCard = ({
  post,
  dict,
  prefix,
  locale,
}: {
  post: BoardPostMeta;
  dict: CommunityDict;
  prefix: string;
  locale: string;
}) => (
  <Link
    href={`${prefix}/community/${post.id}`}
    className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card-bg transition-all duration-base hover:-translate-y-0.5 hover:border-board-accent"
  >
    {post.imageId && (
      <div className="aspect-[4/5] w-full overflow-hidden bg-[#0B0A14]">
        {/* Wrapped 카드는 세로형 가변 높이 — 타일에서는 상단 기준으로 자르고 상세에서 원본 노출 */}
        <img
          src={`/api/board/images/${post.imageId}`}
          alt={post.title}
          loading="lazy"
          className="h-full w-full object-cover object-top"
        />
      </div>
    )}
    <div className="flex flex-1 flex-col gap-2 px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-tag font-medium text-text-tertiary">
        <span className={`h-1.5 w-1.5 rounded-full ${BOARD_CATEGORY_DOTS[post.category]}`} />
        {boardCategoryLabel(dict, post.category)}
      </div>
      <h3
        className={`text-card-title tracking-[-0.01em] ${post.imageId ? "line-clamp-1" : "line-clamp-2"}`}
      >
        {post.title}
      </h3>
      {!post.imageId && (
        <p className="line-clamp-3 text-card-desc text-text-secondary">{post.excerpt}</p>
      )}
      <div className="mt-auto flex items-center gap-2 pt-2 text-meta text-text-tertiary">
        {post.author.avatarUrl && (
          <img
            src={post.author.avatarUrl}
            alt=""
            loading="lazy"
            className="h-4 w-4 rounded-full"
          />
        )}
        <span className="truncate">{post.author.username}</span>
        <span className="h-0.5 w-0.5 flex-shrink-0 rounded-full bg-text-muted" />
        <span className="flex-shrink-0">{getRelativeTime(post.createdAt, locale)}</span>
        <span className="ml-auto flex flex-shrink-0 items-center gap-2.5 font-code text-[0.75rem]">
          <span className="flex items-center gap-1">
            <Heart size={12} />
            {post.reactionCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={12} />
            {post.commentCount}
          </span>
        </span>
      </div>
    </div>
  </Link>
);
