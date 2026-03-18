export const revalidate = 3600;

import { prisma } from "@/lib/prisma";
import { PostList } from "@/components/post/PostList";
import { PostItem } from "@/components/post/PostItem";
import { Pagination } from "@/components/home/Pagination";
import Link from "next/link";
import type { Metadata } from "next";
import type { PostMeta } from "@/types";

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

  // 프로젝트 미선택 시 repoName으로 그룹핑
  const grouped = !currentProject
    ? Array.from(
        mapped.reduce((acc, post) => {
          const key = post.repoName || "기타";
          if (!acc.has(key)) acc.set(key, []);
          acc.get(key)!.push(post);
          return acc;
        }, new Map<string, PostMeta[]>())
      )
    : null;

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

      {grouped ? (
        <div className="mx-auto max-w-container px-5 sm:px-8 pb-16 pt-6">
          {grouped.map(([projectName, projectPosts], idx) => (
            <div key={projectName}>
              {idx > 0 && <div className="my-6 border-t border-border" />}
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cat-commits" />
                <h2 className="text-[0.9375rem] font-semibold text-text-primary">
                  {projectName}
                </h2>
                <span className="text-meta text-text-muted">
                  {projectPosts.length}
                </span>
              </div>
              <div className="flex flex-col gap-px">
                {projectPosts.map((post) => (
                  <PostItem key={post.id} post={post} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <PostList posts={mapped} />
      )}

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
