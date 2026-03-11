export const revalidate = 3600;

import { Suspense } from "react";
import Link from "next/link";
import { HeroBanner } from "@/components/home/HeroBanner";
import { CategoryFilter } from "@/components/home/CategoryFilter";
import { PostList } from "@/components/post/PostList";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n";
import { isValidLocale, i18n } from "@/i18n/config";
import type { Category } from "@/types";
import type { Locale } from "@/i18n/config";

const getPosts = async (category?: string) => {
  try {
    const where: Record<string, unknown> = { published: true };
    if (category && category !== "all") {
      where.category = category as Category;
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
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
    });

    return posts.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      subtitle: p.subtitle ?? undefined,
      excerpt: p.excerpt ?? undefined,
      coverImage: p.coverImage ?? undefined,
      commitHash: p.commitHash ?? undefined,
      commitUrl: p.commitUrl ?? undefined,
      repoName: p.repoName ?? undefined,
      filesChanged: p.filesChanged ?? undefined,
    }));
  } catch {
    return [];
  }
};

const Home = async ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
}) => {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : i18n.defaultLocale;
  const dict = await getDictionary(locale);
  const sp = await searchParams;
  const posts = await getPosts(sp.category);

  const prefix = locale === "ko" ? "" : `/${locale}`;

  return (
    <>
      <HeroBanner dict={dict.hero} />

      <div className="mx-auto flex max-w-container items-center justify-between px-8 pt-12">
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
        <CategoryFilter dict={dict.category} />
      </Suspense>

      <PostList posts={posts} />
    </>
  );
};

export default Home;
