"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";

interface CategoryDict {
  all: string;
  commits: string;
  articles: string;
  techlab: string;
  casual: string;
}

export const CategoryFilter = ({ dict }: { dict: CategoryDict }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const current = searchParams.get("category") || "all";

  const labels: Record<string, string> = {
    all: dict.all,
    commits: dict.commits,
    articles: dict.articles,
    techlab: dict.techlab,
    casual: dict.casual,
  };

  const handleFilter = (key: string) => {
    if (key === "all") {
      router.push(pathname, { scroll: false });
    } else {
      router.push(`${pathname}?category=${key}`, { scroll: false });
    }
  };

  return (
    <div className="mx-auto flex max-w-container flex-wrap gap-2 px-5 sm:px-8 pt-5">
      {siteConfig.categories.map((cat) => (
        <button
          key={cat.key}
          onClick={() => handleFilter(cat.key)}
          className={`rounded-full border px-4 py-1.5 text-meta font-medium transition-all duration-base ${
            current === cat.key
              ? "border-text-primary bg-text-primary text-bg-primary"
              : "border-border bg-bg-primary text-text-tertiary hover:border-text-tertiary hover:text-text-secondary"
          }`}
        >
          {labels[cat.key] || cat.label}
        </button>
      ))}
    </div>
  );
};
