export const revalidate = 3600;

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "시리즈" };

const SeriesPage = async () => {
  const seriesList = await prisma.series.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { posts: true } } },
  }).catch(() => []);

  return (
    <div className="mx-auto max-w-container px-5 sm:px-8 py-12">
      <h1 className="mb-6 text-section-title">시리즈</h1>

      {seriesList.length === 0 ? (
        <p className="text-text-tertiary">아직 시리즈가 없습니다.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {seriesList.map((series) => (
            <Link
              key={series.id}
              href={`/series/${series.slug}`}
              className="rounded-xl border border-border p-5 transition-all duration-base hover:border-brand-primary"
            >
              <h2 className="mb-1 text-card-title">{series.title}</h2>
              {series.description && (
                <p className="mb-2 text-card-desc text-text-secondary">
                  {series.description}
                </p>
              )}
              <span className="text-meta text-text-muted">
                {series._count.posts}개의 글
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SeriesPage;
