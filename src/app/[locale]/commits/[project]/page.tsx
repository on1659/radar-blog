export const revalidate = 3600;

import { prisma } from "@/lib/prisma";
import { PostList } from "@/components/post/PostList";
import { Pagination } from "@/components/home/Pagination";
import Link from "next/link";
import type { Metadata } from "next";

const PAGE_SIZE = 10;

interface PageProps {
  params: Promise<{ project: string }>;
  searchParams: Promise<{ page?: string }>;
}

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { project } = await params;
  return { title: `${project} — Commits` };
};

const ProjectCommitsPage = async ({ params, searchParams }: PageProps) => {
  const { project } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const where = { published: true, category: "commits" as const, repoName: project };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, slug: true, title: true, subtitle: true, excerpt: true,
        category: true, coverImage: true, tags: true, readingTime: true,
        createdAt: true, published: true, featured: true,
        commitHash: true, commitUrl: true, repoName: true, filesChanged: true,
      },
    }).catch(() => []),
    prisma.post.count({ where }).catch(() => 0),
  ]);

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
        <div className="flex items-center gap-3">
          <Link
            href="/commits"
            className="text-text-muted transition-colors hover:text-text-primary"
          >
            ← Commits
          </Link>
        </div>
        <h1 className="mt-3 text-section-title">{project}</h1>
        <p className="mt-2 text-card-desc text-text-secondary">
          {project} 프로젝트의 커밋 기록 ({total}개)
        </p>
      </div>
      <PostList posts={mapped} />
      {totalPages > 1 && (
        <div className="mx-auto max-w-container px-5 sm:px-8 pb-16">
          <Pagination currentPage={page} totalPages={totalPages} />
        </div>
      )}
    </div>
  );
};

export default ProjectCommitsPage;
