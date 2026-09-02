import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { getRelativeTime } from "@/lib/relative-time";
import { BOARD_CATEGORY_DOTS, boardCategoryLabel } from "./BoardCard";
import type { BoardPostMeta, CommunityDict } from "@/types";

/** 글로 보기(리스트형) 행 — 블로그 PostItem 어법(border-b + 좌측 썸네일)을 게시판에 맞게 재현 */
export const BoardListItem = ({
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
    className="group flex gap-4 border-b border-border-light py-5 transition-all duration-base last:border-b-0 hover:mx-[-16px] hover:rounded-xl hover:bg-card-hover hover:px-4"
  >
    {/* 썸네일 슬롯 — 이미지 있으면 상단 기준 크롭, 없으면 카테고리 도트 플레이스홀더로 정렬 유지 */}
    <div className="flex h-[76px] w-[76px] flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-[#0B0A14] sm:h-[88px] sm:w-[88px]">
      {post.imageId ? (
        <img
          src={`/api/board/images/${post.imageId}`}
          alt={post.title}
          loading="lazy"
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <span className={`h-2.5 w-2.5 rounded-full ${BOARD_CATEGORY_DOTS[post.category]}`} />
      )}
    </div>

    <div className="flex min-w-0 flex-1 flex-col justify-center">
      <div className="mb-1 flex items-center gap-1.5 text-tag font-medium text-text-tertiary">
        <span className={`h-1.5 w-1.5 rounded-full ${BOARD_CATEGORY_DOTS[post.category]}`} />
        {boardCategoryLabel(dict, post.category)}
      </div>
      <h3 className="line-clamp-1 text-card-title tracking-[-0.01em]">{post.title}</h3>
      <p className="mt-1 line-clamp-1 text-card-desc text-text-secondary sm:line-clamp-2">
        {post.excerpt}
      </p>
      <div className="mt-2 flex items-center gap-2 text-meta text-text-tertiary">
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
