export const revalidate = 3600;

import { prisma } from "@/lib/prisma";
import { PostList } from "@/components/post/PostList";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ project: string }>;
}

export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { project } = await params;
  return { title: `${project} — Commits` };
};

const ProjectCommitsPage = async ({ params }: PageProps) => {
  const { project } = await params;

  const posts = await prisma.post.findMany({
    where: {
      published: true,
      category: "commits",
      repoName: project,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, title: true, subtitle: true, excerpt: true,
      category: true, coverImage: true, tags: true, readingTime: true,
      createdAt: true, published: true, featured: true,
      commitHash: true, commitUrl: true, repoName: true, filesChanged: true,
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
      <div className="mx-auto max-w-container px-8 pt-12">
        <h1 className="text-section-title">{project}</h1>
        <p className="mt-2 text-card-desc text-text-secondary">
          {project} 프로젝트의 커밋 기록
        </p>
      </div>
      <PostList posts={mapped} />
    </div>
  );
};

export default ProjectCommitsPage;
