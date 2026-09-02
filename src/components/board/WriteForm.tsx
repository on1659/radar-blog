"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader, type UploadedImage } from "./ImageUploader";
import { BOARD_CATEGORY_DOTS } from "./BoardCard";
import { BOARD_BODY_MAX, BOARD_TITLE_MAX } from "@/lib/board";
import type { ApiResponse, BoardCategoryKey, CommunityDict } from "@/types";

export const WriteForm = ({ dict, prefix }: { dict: CommunityDict; prefix: string }) => {
  const router = useRouter();
  const [category, setCategory] = useState<BoardCategoryKey>("showcase");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories: { key: BoardCategoryKey; label: string }[] = [
    { key: "showcase", label: dict.categoryShowcase },
    { key: "chat", label: dict.categoryChat },
    { key: "question", label: dict.categoryQuestion },
  ];

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (category === "showcase" && !image) {
      setError(dict.imageRequired);
      return;
    }
    if (!title.trim() || !body.trim()) {
      setError(dict.errorGeneric);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/board/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, body, imageId: image?.id }),
      });
      const json = (await res.json()) as ApiResponse<{ id: string }>;
      if (!json.success || !json.data) {
        if (res.status === 429) setError(dict.errorRateLimited);
        else if (json.error === "GITHUB_LOGIN_REQUIRED") setError(dict.reLoginRequired);
        else if (json.error === "IMAGE_REQUIRED") setError(dict.imageRequired);
        else setError(dict.errorGeneric);
        return;
      }
      router.push(`${prefix}/community/${json.data.id}`);
    } catch {
      setError(dict.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-5"
    >
      {/* 카테고리 선택 — 목록 필터 칩과 동일한 어법 */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => {
          const active = category === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-meta font-medium transition-all duration-base ${
                active
                  ? "border-text-primary bg-text-primary text-bg-primary"
                  : "border-border bg-bg-primary text-text-tertiary hover:border-text-tertiary hover:text-text-secondary"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${BOARD_CATEGORY_DOTS[cat.key]}`} />
              {cat.label}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={dict.titlePlaceholder}
        maxLength={BOARD_TITLE_MAX}
        required
        className="w-full rounded-lg border border-border bg-bg-primary px-4 py-2.5 text-card-title tracking-[-0.01em] placeholder:font-normal placeholder:text-text-muted"
      />

      <ImageUploader dict={dict} value={image} onChange={setImage} />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={dict.bodyPlaceholder}
        maxLength={BOARD_BODY_MAX}
        required
        rows={8}
        className="w-full resize-y rounded-lg border border-border bg-bg-primary px-4 py-3 text-body placeholder:text-text-muted"
      />

      {error && <p className="text-meta text-[#EF4444]">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-board-accent px-6 py-2.5 text-meta font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? dict.submitting : dict.submit}
        </button>
      </div>
    </form>
  );
};
