import type { Category } from "@/types";

const categoryStyles: Record<Category, string> = {
  commits: "bg-[rgba(0,196,113,0.12)] text-cat-commits",
  articles: "bg-[rgba(49,130,246,0.12)] text-cat-articles",
  casual: "bg-[rgba(255,107,53,0.12)] text-cat-casual",
  signal: "bg-[rgba(6,182,212,0.12)] text-cat-signal",
};

const categoryLabels: Record<Category, string> = {
  commits: "commits",
  articles: "articles",
  casual: "casual",
  signal: "ai signal",
};

export const Badge = ({ category }: { category: Category }) => {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.03em] ${categoryStyles[category]}`}
    >
      {categoryLabels[category]}
    </span>
  );
};
