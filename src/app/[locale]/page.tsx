export const revalidate = 3600;

import { Suspense } from "react";
import Link from "next/link";
import { HeroBanner } from "@/components/home/HeroBanner";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { RecentPostsSidebar } from "@/components/home/RecentPostsSidebar";
import { Pagination } from "@/components/home/Pagination";
import { PostList } from "@/components/post/PostList";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n";
import { isValidLocale, i18n } from "@/i18n/config";
import type { Category } from "@/types";
import type { Locale } from "@/i18n/config";

const PAGE_SIZE = 10;

const getPosts = async (category?: string, project?: string, page = 1) => {
  try {
    const where: Record<string, unknown> = { published: true };
    if (category && category !== "all") {
      where.category = category as Category;
      if (category === "commits" && project) {
        where.repoName = project;
      }
    } else {
      // "전체"에서는 commits 제외
      where.category = { not: "commits" };
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          slug: true,
          title: true,
          subtitle: true,
          excerpt: true,
          category: true,
          coverImage: true,
          tags: true,
          readingTime: true,
          createdAt: true,
          published: true,
          featured: true,
          commitHash: true,
          commitUrl: true,
          repoName: true,
          filesChanged: true,
        },
      }),
      prisma.post.count({ where }),
    ]);

    return {
      posts: posts.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        subtitle: p.subtitle ?? undefined,
        excerpt: p.excerpt ?? undefined,
        coverImage: p.coverImage ?? undefined,
        commitHash: p.commitHash ?? undefined,
        commitUrl: p.commitUrl ?? undefined,
        repoName: p.repoName ?? undefined,
        filesChanged: p.filesChanged ?? undefined,
      })),
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  } catch {
    return { posts: [], totalPages: 0 };
  }
};

const getCommitProjects = async (): Promise<string[]> => {
  try {
    const raw = await prisma.post.findMany({
      where: { published: true, category: "commits", repoName: { not: null } },
      distinct: ["repoName"],
      select: { repoName: true },
      orderBy: { repoName: "asc" },
    });
    return raw.map((p) => p.repoName).filter(Boolean) as string[];
  } catch {
    return [];
  }
};

const Home = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; project?: string; page?: string }>;
}) => {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : i18n.defaultLocale;
  const dict = await getDictionary(locale);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { posts, totalPages } = await getPosts(sp.category, sp.project, page);
  const commitProjects = sp.category === "commits" ? await getCommitProjects() : [];

  const prefix = locale === "ko" ? "" : `/${locale}`;

  return (
    <>
      <HeroBanner dict={dict.hero} />

      <div className="mx-auto flex max-w-container items-center justify-between px-5 sm:px-8 pt-12">
        <h2 className="text-[1.375rem] font-bold tracking-[-0.02em]">
          {dict.home.recentPosts}
        </h2>
        <Link
          href={`${prefix}/articles`}
          className="text-sm font-medium text-text-tertiary transition-colors duration-base hover:text-brand-primary"
        >
          {dict.home.viewAll} →
        </Link>
      </div>

      <Suspense>
        <CategoryFilter dict={dict.category} commitProjects={commitProjects} />
      </Suspense>

      <div className="mx-auto flex max-w-container flex-col gap-8 px-5 sm:px-8 pb-16 pt-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <PostList posts={posts} bare />
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              category={sp.category}
              extraParams={sp.project ? { project: sp.project } : undefined}
            />
          )}
        </div>
        <RecentPostsSidebar posts={posts} title={dict.home.recentSidebar} />
      </div>
    </>
  );
};

export default Home;
