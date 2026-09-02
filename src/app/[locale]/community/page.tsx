import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n";
import { i18n, isValidLocale } from "@/i18n/config";
import { BoardBanner } from "@/components/board/BoardBanner";
import { BoardCard } from "@/components/board/BoardCard";
import { BoardListItem } from "@/components/board/BoardListItem";
import { CategoryTabs } from "@/components/board/CategoryTabs";
import { ViewToggle } from "@/components/board/ViewToggle";
import { RadarEmblem } from "@/components/board/RadarEmblem";
import { Pagination } from "@/components/home/Pagination";
import { BOARD_PAGE_SIZE, isBoardCategory } from "@/lib/board";
import type { Locale } from "@/i18n/config";
import type { BoardCategoryKey, BoardPostMeta, BoardViewMode } from "@/types";

// 게시판은 최신성이 우선이라 항상 동적 렌더링한다.
// revalidatePath는 ko 무프리픽스 rewrite(/community → /ko/community)와 얽혀
// 경로 계산이 틀어질 수 있어 쓰지 않는다.
export const dynamic = "force-dynamic";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> => {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : i18n.defaultLocale;
  const dict = await getDictionary(locale);
  return { title: dict.community.title, description: dict.community.subtitle };
};

const CommunityPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; page?: string; view?: string }>;
}) => {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : i18n.defaultLocale;
  const dict = await getDictionary(locale);
  const prefix = locale === "ko" ? "" : `/${locale}`;

  const sp = await searchParams;
  const category: "all" | BoardCategoryKey =
    sp.category && isBoardCategory(sp.category) ? sp.category : "all";
  const pageNum = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const view: BoardViewMode = sp.view === "list" ? "list" : "grid";

  const where = category === "all" ? {} : { category };
  const result = await prisma
    .$transaction([
      prisma.boardPost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * BOARD_PAGE_SIZE,
        take: BOARD_PAGE_SIZE,
        select: {
          id: true,
          category: true,
          title: true,
          body: true,
          createdAt: true,
          author: { select: { id: true, username: true, avatarUrl: true } },
          images: { select: { id: true }, take: 1 },
          _count: { select: { comments: true, reactions: true } },
        },
      }),
      prisma.boardPost.count({ where }),
      prisma.boardPost.count(),
    ])
    .catch(() => null); // DB 장애 시 빈 목록 폴백 (읽기 컨벤션)

  const rows = result?.[0] ?? [];
  const filteredTotal = result?.[1] ?? 0;
  const totalSignals = result?.[2] ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / BOARD_PAGE_SIZE));

  const posts: BoardPostMeta[] = rows.map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    excerpt: row.body.replace(/\s+/g, " ").slice(0, 160),
    imageId: row.images[0]?.id ?? null,
    author: row.author,
    createdAt: row.createdAt.toISOString(),
    commentCount: row._count.comments,
    reactionCount: row._count.reactions,
  }));

  return (
    <>
      <BoardBanner dict={dict.community} prefix={prefix} totalCount={totalSignals} />
      <div className="mx-auto max-w-container px-5 pb-16 pt-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CategoryTabs dict={dict.community} prefix={prefix} current={category} view={view} />
          <ViewToggle
            dict={dict.community}
            prefix={prefix}
            current={view}
            category={category}
            page={pageNum}
          />
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <RadarEmblem size={44} animated={false} className="text-text-muted" />
            <p className="text-card-title text-text-secondary">{dict.community.emptyTitle}</p>
            <p className="text-card-desc text-text-tertiary">{dict.community.emptyBody}</p>
            <Link
              href={`${prefix}/community/write`}
              className="mt-2 rounded-lg bg-board-accent px-5 py-2.5 text-meta font-medium text-white transition-opacity hover:opacity-90"
            >
              {dict.community.write}
            </Link>
          </div>
        ) : (
          <>
            {view === "list" ? (
              <div className="mt-4">
                {posts.map((post) => (
                  <BoardListItem
                    key={post.id}
                    post={post}
                    dict={dict.community}
                    prefix={prefix}
                    locale={locale}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <BoardCard
                    key={post.id}
                    post={post}
                    dict={dict.community}
                    prefix={prefix}
                    locale={locale}
                  />
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <Pagination
                currentPage={pageNum}
                totalPages={totalPages}
                category={category}
                extraParams={view === "list" ? { view: "list" } : undefined}
              />
            )}
          </>
        )}
      </div>
    </>
  );
};

export default CommunityPage;
