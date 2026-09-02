"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GitHubLoginButton } from "./GitHubLoginButton";
import { getRelativeTime } from "@/lib/relative-time";
import { BOARD_COMMENT_MAX } from "@/lib/board";
import type { ApiResponse, BoardCommentDto, CommunityDict } from "@/types";

export const CommentSection = ({
  postId,
  comments,
  me,
  locale,
  dict,
}: {
  postId: string;
  comments: BoardCommentDto[];
  me: { githubId: string | null; isAdmin: boolean; canWrite: boolean };
  locale: string;
  dict: CommunityDict;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/board/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = (await res.json()) as ApiResponse;
      if (!json.success) {
        if (res.status === 429) setError(dict.errorRateLimited);
        else if (json.error === "GITHUB_LOGIN_REQUIRED") setError(dict.reLoginRequired);
        else setError(dict.errorGeneric);
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError(dict.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  const removeComment = async (id: string) => {
    if (!window.confirm(dict.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/board/comments/${id}`, { method: "DELETE" });
      const json = (await res.json()) as ApiResponse;
      if (json.success) router.refresh();
      else setError(dict.errorGeneric);
    } catch {
      setError(dict.errorGeneric);
    }
  };

  return (
    <section>
      <h2 className="text-sub-heading tracking-[-0.01em]">
        {dict.comments}
        <span className="ml-2 font-code text-[0.8125rem] font-normal text-text-tertiary">
          {comments.length}
        </span>
      </h2>

      <div className="mt-2">
        {comments.map((comment) => {
          const canDelete = me.isAdmin || (me.githubId !== null && me.githubId === comment.author.id);
          return (
            <div key={comment.id} className="border-b border-border-light py-4 last:border-b-0">
              <div className="flex items-center gap-2 text-meta text-text-tertiary">
                {comment.author.avatarUrl && (
                  <img
                    src={comment.author.avatarUrl}
                    alt=""
                    loading="lazy"
                    className="h-5 w-5 rounded-full"
                  />
                )}
                <span className="font-medium text-text-secondary">{comment.author.username}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-text-muted" />
                <span>{getRelativeTime(comment.createdAt, locale)}</span>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => void removeComment(comment.id)}
                    className="ml-auto text-tag text-text-muted transition-colors duration-base hover:text-[#EF4444]"
                  >
                    {dict.delete}
                  </button>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-card-desc text-text-primary">
                {comment.body}
              </p>
            </div>
          );
        })}
      </div>

      {me.canWrite ? (
        <div className="mt-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={dict.commentPlaceholder}
            maxLength={BOARD_COMMENT_MAX}
            rows={3}
            className="w-full resize-y rounded-lg border border-border bg-bg-primary px-4 py-3 text-card-desc placeholder:text-text-muted"
          />
          {error && <p className="mt-1 text-meta text-[#EF4444]">{error}</p>}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              disabled={busy || !body.trim()}
              onClick={() => void submit()}
              className="rounded-lg bg-board-accent px-5 py-2 text-meta font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? dict.submitting : dict.submit}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-start gap-3 rounded-xl border border-border bg-bg-secondary px-5 py-5">
          <p className="text-card-desc text-text-secondary">{dict.loginTitle}</p>
          <GitHubLoginButton label={dict.loginWithGitHub} redirectTo={pathname} />
        </div>
      )}
    </section>
  );
};
