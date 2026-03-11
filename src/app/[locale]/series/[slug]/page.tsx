export const revalidate = 3600;

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PostList } from "@/components/post/PostList";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const series = await prisma.series.findUnique({
    where: { slug },
    select: { title: true },
  }).catch(() => null);
  if (!series) return { title: "Not Found" };
  return { title: series.title };
};

const SeriesDetailPage = async ({ params }: PageProps) => {
  const { slug } = await params;

  const series = await prisma.series.findUnique({
    where: { slug },
    include: {
      posts: {
        where: { published: true },
        orderBy: { seriesOrder: "asc" },
        select: {
          id: true, slug: true, title: true, subtitle: true, excerpt: true,
          category: true, coverImage: true, tags: true, readingTime: true,
          createdAt: true, published: true, featured: true,
          commitHash: true, commitUrl: true, repoName: true, filesChanged: true,
        },
      },
    },
  }).catch(() => null);

  if (!series) notFound();

  const mapped = series.posts.map((p) => ({
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

  return (
    <div>
      <div className="mx-auto max-w-container px-8 pt-12">
        <h1 className="text-section-title">{series.title}</h1>
        {series.description && (
          <p className="mt-2 text-card-desc text-text-secondary">
            {series.description}
          </p>
        )}
      </div>
      <PostList posts={mapped} />
    </div>
  );
};

export default SeriesDetailPage;
