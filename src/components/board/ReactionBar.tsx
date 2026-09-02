"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { signIn } from "next-auth/react";
import { BOARD_EMOJIS } from "@/lib/board";
import type { ApiResponse, CommunityDict } from "@/types";

export const ReactionBar = ({
  postId,
  counts: initialCounts,
  mine: initialMine,
  canReact,
  dict,
}: {
  postId: string;
  counts: Record<string, number>;
  mine: string[];
  canReact: boolean;
  dict: CommunityDict;
}) => {
  const pathname = usePathname();
  const [counts, setCounts] = useState(initialCounts);
  const [mine, setMine] = useState(initialMine);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (emoji: string) => {
    if (busy) return;
    if (!canReact) {
      // 미로그인/구 세션 — GitHub 로그인 후 현재 글로 복귀
      void signIn("github", { redirectTo: pathname });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/board/posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const json = (await res.json()) as ApiResponse<{
        counts: Record<string, number>;
        mine: string[];
      }>;
      if (!json.success || !json.data) {
        if (json.error === "GITHUB_LOGIN_REQUIRED") void signIn("github", { redirectTo: pathname });
        else if (res.status === 429) setError(dict.errorRateLimited);
        else setError(dict.errorGeneric);
        return;
      }
      setCounts(json.data.counts);
      setMine(json.data.mine);
    } catch {
      setError(dict.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {BOARD_EMOJIS.map((emoji) => {
          const active = mine.includes(emoji);
          return (
            <button
              key={emoji}
              type="button"
              aria-pressed={active}
              disabled={busy}
              onClick={() => void toggle(emoji)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-meta transition-all duration-base disabled:opacity-50 ${
                active
                  ? "border-board-accent bg-board-accent-light text-text-primary"
                  : "border-border text-text-tertiary hover:border-text-tertiary hover:text-text-secondary"
              }`}
            >
              <span aria-hidden="true">{emoji}</span>
              <span className="font-code text-[0.75rem]">{counts[emoji] ?? 0}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-meta text-[#EF4444]">{error}</p>}
    </div>
  );
};
