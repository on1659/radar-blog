export const revalidate = 3600;

import { prisma } from "@/lib/prisma";
import { PostList } from "@/components/post/PostList";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ tag: string }>;
}

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
};

const TagPage = async ({ params }: PageProps) => {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);

  const posts = await prisma.post.findMany({
    where: { published: true, tags: { has: decoded } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, title: true, subtitle: true, excerpt: true,
      category: true, coverImage: true, tags: true, readingTime: true,
      createdAt: true, published: true, featured: true,
      commitHash: true, commitUrl: true, repoName: true, filesChanged: true, viewCount: true,
    },
  }).catch(() => []);

  const mapped = posts.map((p) => ({
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
      <div className="mx-auto max-w-container px-5 sm:px-8 pt-12">
        <h1 className="text-section-title">#{decoded}</h1>
        <p className="mt-2 text-card-desc text-text-secondary">
          {mapped.length}개의 게시물
        </p>
      </div>
      <PostList posts={mapped} />
    </div>
  );
};

export default TagPage;
