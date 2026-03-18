export const revalidate = 3600;

import { prisma } from "@/lib/prisma";
import { PostList } from "@/components/post/PostList";
import { Pagination } from "@/components/home/Pagination";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Commits" };

const PAGE_SIZE = 10;

const CommitsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; page?: string }>;
}) => {
  const sp = await searchParams;
  const currentProject = sp.project || null;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Record<string, unknown> = { published: true, category: "commits" };
  if (currentProject) {
    where.repoName = currentProject;
  }

  const [posts, total, projectNames] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, slug: true, title: true, subtitle: true, excerpt: true,
        category: true, coverImage: true, tags: true, readingTime: true,
        createdAt: true, published: true, featured: true,
        commitHash: true, commitUrl: true, repoName: true, filesChanged: true, viewCount: true,
      },
    }).catch(() => []),
    prisma.post.count({ where }).catch(() => 0),
    prisma.post.findMany({
      where: { published: true, category: "commits", repoName: { not: null } },
      distinct: ["repoName"],
      select: { repoName: true },
      orderBy: { repoName: "asc" },
    }).catch(() => []),
  ]);

  const projects = projectNames.map((p) => p.repoName).filter(Boolean) as string[];
  const totalPages = Math.ceil(total / PAGE_SIZE);

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
        <h1 className="text-section-title">Commits</h1>
        <p className="mt-2 text-card-desc text-text-secondary">
          GitHub 커밋 기반으로 자동 생성된 개발 기록
        </p>
        {projects.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/commits"
              className={`rounded-full border px-4 py-1.5 text-meta font-medium transition-all duration-base ${
                !currentProject
                  ? "border-cat-commits bg-cat-commits text-white"
                  : "border-border text-text-tertiary hover:border-cat-commits hover:text-cat-commits"
              }`}
            >
              전체
            </Link>
            {projects.map((proj) => (
              <Link
                key={proj}
                href={`/commits?project=${proj}`}
                className={`rounded-full border px-4 py-1.5 text-meta font-medium transition-all duration-base ${
                  currentProject === proj
                    ? "border-cat-commits bg-cat-commits text-white"
                    : "border-border text-text-tertiary hover:border-cat-commits hover:text-cat-commits"
                }`}
              >
                {proj}
              </Link>
            ))}
          </div>
        )}
      </div>
      <PostList posts={mapped} />
      {totalPages > 1 && (
        <div className="mx-auto max-w-container px-5 sm:px-8 pb-16">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            extraParams={currentProject ? { project: currentProject } : undefined}
          />
        </div>
      )}
    </div>
  );
};

export default CommitsPage;
