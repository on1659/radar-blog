"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";

interface CategoryDict {
  all: string;
  commits: string;
  articles: string;
  casual: string;
  signal: string;
}

export const CategoryFilter = ({
  dict,
  commitProjects = [],
}: {
  dict: CategoryDict;
  commitProjects?: string[];
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const current = searchParams.get("category") || "all";
  const currentProject = searchParams.get("project") || null;

  const labels: Record<string, string> = {
    all: dict.all,
    commits: dict.commits,
    articles: dict.articles,
    casual: dict.casual,
    signal: dict.signal,
  };

  const handleFilter = (key: string) => {
    if (key === "all") {
      router.push(pathname, { scroll: false });
    } else {
      router.push(`${pathname}?category=${key}`, { scroll: false });
    }
  };

  const handleProject = (proj: string | null) => {
    if (proj) {
      router.push(`${pathname}?category=commits&project=${proj}`, { scroll: false });
    } else {
      router.push(`${pathname}?category=commits`, { scroll: false });
    }
  };

  return (
    <div className="mx-auto flex max-w-container flex-wrap items-center gap-2 px-5 sm:px-8 pt-5">
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

      {current === "commits" && commitProjects.length > 0 && (
        <>
          <span className="mx-1 h-5 w-px bg-border" />
          <button
            onClick={() => handleProject(null)}
            className={`rounded-full border px-3 py-1 text-[0.6875rem] font-medium transition-all duration-base ${
              !currentProject
                ? "border-cat-commits bg-cat-commits text-white"
                : "border-border text-text-tertiary hover:border-cat-commits hover:text-cat-commits"
            }`}
          >
            전체
          </button>
          {commitProjects.map((proj) => (
            <button
              key={proj}
              onClick={() => handleProject(proj)}
              className={`rounded-full border px-3 py-1 text-[0.6875rem] font-medium transition-all duration-base ${
                currentProject === proj
                  ? "border-cat-commits bg-cat-commits text-white"
                  : "border-border text-text-tertiary hover:border-cat-commits hover:text-cat-commits"
              }`}
            >
              {proj}
            </button>
          ))}
        </>
      )}
    </div>
  );
};
