import Link from "next/link";
import { BOARD_CATEGORY_DOTS } from "./BoardCard";
import type { BoardCategoryKey, BoardViewMode, CommunityDict } from "@/types";

/** URL 쿼리 기반 필터 칩 — 클라이언트 JS 없이 Link로 동작. 현재 보기 방식(view)은 보존한다. */
export const CategoryTabs = ({
  dict,
  prefix,
  current,
  view,
}: {
  dict: CommunityDict;
  prefix: string;
  current: "all" | BoardCategoryKey;
  view: BoardViewMode;
}) => {
  const tabs: { key: "all" | BoardCategoryKey; label: string }[] = [
    { key: "all", label: dict.categoryAll },
    { key: "showcase", label: dict.categoryShowcase },
    { key: "chat", label: dict.categoryChat },
    { key: "question", label: dict.categoryQuestion },
  ];

  const buildHref = (key: "all" | BoardCategoryKey) => {
    const params = new URLSearchParams();
    if (key !== "all") params.set("category", key);
    if (view === "list") params.set("view", "list");
    const qs = params.toString();
    return qs ? `${prefix}/community?${qs}` : `${prefix}/community`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const active = current === tab.key;
        const href = buildHref(tab.key);
        return (
          <Link
            key={tab.key}
            href={href}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-meta font-medium transition-all duration-base ${
              active
                ? "border-text-primary bg-text-primary text-bg-primary"
                : "border-border bg-bg-primary text-text-tertiary hover:border-text-tertiary hover:text-text-secondary"
            }`}
          >
            {tab.key !== "all" && (
              <span
                className={`h-1.5 w-1.5 rounded-full ${BOARD_CATEGORY_DOTS[tab.key as BoardCategoryKey]}`}
              />
            )}
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
};
