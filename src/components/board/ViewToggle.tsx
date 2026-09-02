import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import type { BoardCategoryKey, BoardViewMode, CommunityDict } from "@/types";

/**
 * 보기 방식 토글 — 썸네일 갤러리(grid) / 글 리스트(list).
 * URL 쿼리 기반(Link)이라 클라이언트 JS 없이 동작하고, 현재 카테고리·페이지를 보존한다.
 */
export const ViewToggle = ({
  dict,
  prefix,
  current,
  category,
  page,
}: {
  dict: CommunityDict;
  prefix: string;
  current: BoardViewMode;
  category: "all" | BoardCategoryKey;
  page: number;
}) => {
  const buildHref = (view: BoardViewMode) => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (page > 1) params.set("page", String(page));
    if (view === "list") params.set("view", "list");
    const qs = params.toString();
    return qs ? `${prefix}/community?${qs}` : `${prefix}/community`;
  };

  const options: { view: BoardViewMode; label: string; Icon: typeof LayoutGrid }[] = [
    { view: "grid", label: dict.viewGrid, Icon: LayoutGrid },
    { view: "list", label: dict.viewList, Icon: List },
  ];

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
      {options.map(({ view, label, Icon }) => {
        const active = current === view;
        return (
          <Link
            key={view}
            href={buildHref(view)}
            aria-label={label}
            title={label}
            aria-current={active ? "true" : undefined}
            className={`flex items-center justify-center rounded-md p-1.5 transition-colors duration-base ${
              active
                ? "bg-board-accent-light text-board-accent"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <Icon size={16} strokeWidth={2} />
          </Link>
        );
      })}
    </div>
  );
};
