export const revalidate = 3600;

import { prisma } from "@/lib/prisma";
import { PostList } from "@/components/post/PostList";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Commits" };

const CommitsPage = async () => {
  const posts = await prisma.post.findMany({
    where: { published: true, category: "commits" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, title: true, subtitle: true, excerpt: true,
      category: true, coverImage: true, tags: true, readingTime: true,
      createdAt: true, published: true, featured: true,
      commitHash: true, commitUrl: true, repoName: true, filesChanged: true,
      projectSlug: true,
    },
  }).catch(() => []);

  // 프로젝트별 그룹핑
  const projects = [...new Set(posts.map((p) => p.repoName).filter(Boolean))];

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
      <div className="mx-auto max-w-container px-8 pt-12">
        <h1 className="text-section-title">Commits</h1>
        <p className="mt-2 text-card-desc text-text-secondary">
          GitHub 커밋 기반으로 자동 생성된 개발 기록
        </p>
        {projects.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {projects.map((proj) => (
              <Link
                key={proj}
                href={`/commits/${proj}`}
                className="rounded-full border border-border px-4 py-1.5 text-meta font-medium text-text-tertiary transition-all duration-base hover:border-cat-commits hover:text-cat-commits"
              >
                {proj}
              </Link>
            ))}
          </div>
        )}
      </div>
      <PostList posts={mapped} />
    </div>
  );
};

export default CommitsPage;
