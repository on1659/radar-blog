export const revalidate = 3600;

import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { renderMarkdown, extractHeadings } from "@/lib/markdown";
import { PostDetailHeader } from "@/components/post/PostDetail";
import { TableOfContents } from "@/components/post/TableOfContents";
import { PostNav } from "@/components/post/PostNav";
import { GiscusComments } from "@/components/post/GiscusComments";
import { ViewTracker } from "./ViewTracker";
import type { Category } from "@/types";
import Link from "next/link";

const getPost = cache(async (rawSlug: string) => {
  const slug = decodeURIComponent(rawSlug);
  return prisma.post.findUnique({ where: { slug } }).catch(() => null);
});

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return { title: "Not Found" };

  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: "article",
    },
  };
};

const PostPage = async ({ params }: PageProps) => {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || !post.published) notFound();

  const headings = extractHeadings(post.content);
  const content = await renderMarkdown(post.content);

  // 이전/다음 글
  const [prev, next] = await Promise.all([
    prisma.post.findFirst({
      where: { published: true, createdAt: { lt: post.createdAt } },
      orderBy: { createdAt: "desc" },
      select: { slug: true, title: true },
    }),
    prisma.post.findFirst({
      where: { published: true, createdAt: { gt: post.createdAt } },
      orderBy: { createdAt: "asc" },
      select: { slug: true, title: true },
    }),
  ]);

  // 시리즈 정보
  const seriesInfo = post.seriesId
    ? await prisma.series.findUnique({
        where: { id: post.seriesId },
        include: {
          posts: {
            where: { published: true },
            orderBy: { seriesOrder: "asc" },
            select: { id: true, slug: true, title: true, seriesOrder: true },
          },
        },
      })
    : null;

  const seriesIndex = seriesInfo
    ? seriesInfo.posts.findIndex((p) => p.id === post.id) + 1
    : 0;
  const seriesTotal = seriesInfo?.posts.length || 0;
  const seriesPrev = seriesInfo?.posts[seriesIndex - 2] || null;
  const seriesNext = seriesInfo?.posts[seriesIndex] || null;

  return (
    <>
      <ViewTracker postId={post.id} />

      {/* 시리즈 배너 */}
      {seriesInfo && (
        <div className="mx-auto max-w-[1000px] px-5 sm:px-8 pt-6">
          <Link
            href={`/series/${seriesInfo.slug}`}
            className="block rounded-xl border border-border bg-bg-secondary px-5 py-3 transition-all duration-base hover:border-brand-primary"
          >
            <div className="text-meta font-semibold text-brand-primary">
              {seriesInfo.title} ({seriesIndex}/{seriesTotal})
            </div>
            {seriesInfo.description && (
              <div className="mt-0.5 text-meta text-text-muted">{seriesInfo.description}</div>
            )}
          </Link>
        </div>
      )}

      <PostDetailHeader
        category={post.category as Category}
        title={post.title}
        subtitle={post.subtitle || undefined}
        createdAt={post.createdAt.toISOString()}
        readingTime={post.readingTime}
      />

      <div className="mx-auto flex max-w-[1000px] gap-12 px-5 sm:px-8">
        <article className="prose prose-lg max-w-content flex-1 pb-20 pt-10 dark:prose-invert">
          {content}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-2 border-t border-border pt-8 not-prose">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tag/${tag}`}
                  className="rounded-full border border-border px-3.5 py-1.5 text-meta font-medium text-text-secondary transition-all duration-base hover:border-brand-primary hover:text-brand-primary"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </article>

        <TableOfContents headings={headings} />
      </div>

      <PostNav
        prev={seriesPrev || prev}
        next={seriesNext || next}
      />
      <GiscusComments />
    </>
  );
};

export default PostPage;
