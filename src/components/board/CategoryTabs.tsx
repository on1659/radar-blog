import Link from "next/link";
import { BOARD_CATEGORY_DOTS } from "./BoardCard";
import type { BoardCategoryKey, CommunityDict } from "@/types";

/** URL 쿼리 기반 필터 칩 — 클라이언트 JS 없이 Link로 동작 */
export const CategoryTabs = ({
  dict,
  prefix,
  current,
}: {
  dict: CommunityDict;
  prefix: string;
  current: "all" | BoardCategoryKey;
}) => {
  const tabs: { key: "all" | BoardCategoryKey; label: string }[] = [
    { key: "all", label: dict.categoryAll },
    { key: "showcase", label: dict.categoryShowcase },
    { key: "chat", label: dict.categoryChat },
    { key: "question", label: dict.categoryQuestion },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const active = current === tab.key;
        const href =
          tab.key === "all" ? `${prefix}/community` : `${prefix}/community?category=${tab.key}`;
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
