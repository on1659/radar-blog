import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getDictionary } from "@/i18n";
import { i18n, isValidLocale } from "@/i18n/config";
import { getBoardSession } from "@/lib/board-auth";
import { getRelativeTime } from "@/lib/relative-time";
import { BOARD_CATEGORY_DOTS, boardCategoryLabel } from "@/components/board/BoardCard";
import { CommentSection } from "@/components/board/CommentSection";
import { DeleteButton } from "@/components/board/DeleteButton";
import { PlainTextBody } from "@/components/board/PlainTextBody";
import { ReactionBar } from "@/components/board/ReactionBar";
import type { Locale } from "@/i18n/config";
import type { BoardCommentDto } from "@/types";

export const dynamic = "force-dynamic";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> => {
  const { id } = await params;
  const post = await prisma.boardPost
    .findUnique({ where: { id }, select: { title: true } })
    .catch(() => null);
  return { title: post?.title ?? "Community" };
};

const CommunityPostPage = async ({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) => {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : i18n.defaultLocale;
  const dict = await getDictionary(locale);
  const prefix = locale === "ko" ? "" : `/${locale}`;

  const session = await getBoardSession();
  const me = {
    githubId: session.kind === "ok" ? session.user.githubId : null,
    isAdmin:
      session.kind === "ok"
        ? session.user.isAdmin
        : session.kind === "no-github"
          ? session.isAdmin
          : false,
    canWrite: session.kind === "ok",
  };

  const post = await prisma.boardPost
    .findUnique({
      where: { id },
      select: {
        id: true,
        category: true,
        title: true,
        body: true,
        createdAt: true,
        author: { select: { id: true, username: true, avatarUrl: true } },
        images: { select: { id: true }, take: 1 },
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { id: true, username: true, avatarUrl: true } },
          },
        },
        reactions: { select: { emoji: true, userId: true } },
      },
    })
    .catch(() => null);

  if (!post) notFound();

  const counts: Record<string, number> = {};
  for (const reaction of post.reactions) {
    counts[reaction.emoji] = (counts[reaction.emoji] ?? 0) + 1;
  }
  const mine = me.githubId
    ? post.reactions.filter((r) => r.userId === me.githubId).map((r) => r.emoji)
    : [];

  const comments: BoardCommentDto[] = post.comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author,
  }));

  const imageId = post.images[0]?.id ?? null;
  const canDelete = me.isAdmin || (me.githubId !== null && me.githubId === post.author.id);

  return (
    <div className="mx-auto max-w-content px-5 pb-16 pt-10 sm:px-8">
      <Link
        href={`${prefix}/community`}
        className="text-meta text-text-tertiary transition-colors duration-base hover:text-text-primary"
      >
        ← {dict.community.backToList}
      </Link>

      <div className="mt-6 flex items-center gap-1.5 text-tag font-medium text-text-tertiary">
        <span className={`h-1.5 w-1.5 rounded-full ${BOARD_CATEGORY_DOTS[post.category]}`} />
        {boardCategoryLabel(dict.community, post.category)}
      </div>

      <h1 className="mt-2 text-section-title tracking-[-0.01em]">{post.title}</h1>

      <div className="mt-3 flex items-center gap-2 border-b border-border pb-5 text-meta text-text-tertiary">
        {post.author.avatarUrl && (
          <img src={post.author.avatarUrl} alt="" className="h-5 w-5 rounded-full" />
        )}
        <span className="font-medium text-text-secondary">{post.author.username}</span>
        <span className="h-0.5 w-0.5 rounded-full bg-text-muted" />
        <span>{getRelativeTime(post.createdAt.toISOString(), locale)}</span>
        {canDelete && (
          <span className="ml-auto">
            <DeleteButton
              endpoint={`/api/board/posts/${post.id}`}
              redirectTo={`${prefix}/community`}
              label={dict.community.delete}
              confirmText={dict.community.deleteConfirm}
            />
          </span>
        )}
      </div>

      {imageId && (
        <img
          src={`/api/board/images/${imageId}`}
          alt={post.title}
          className="mt-6 w-full rounded-xl border border-border bg-[#0B0A14]"
        />
      )}

      <div className="mt-6">
        <PlainTextBody text={post.body} />
      </div>

      <div className="mt-8 border-b border-border pb-8">
        <ReactionBar
          postId={post.id}
          counts={counts}
          mine={mine}
          canReact={me.canWrite}
          dict={dict.community}
        />
      </div>

      <div className="mt-8">
        <CommentSection
          postId={post.id}
          comments={comments}
          me={me}
          locale={locale}
          dict={dict.community}
        />
      </div>
    </div>
  );
};

export default CommunityPostPage;
