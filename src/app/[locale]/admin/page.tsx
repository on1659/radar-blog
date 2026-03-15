export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";

const AdminDashboard = async () => {
  const [total, published, drafts, byCategory, recent] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { published: true } }),
    prisma.post.count({ where: { published: false } }),
    prisma.post.groupBy({ by: ["category"], _count: true }),
    prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, category: true, createdAt: true, slug: true },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-section-title">대시보드</h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "전체 글", value: total },
          { label: "발행됨", value: published },
          { label: "임시저장", value: drafts },
          { label: "카테고리", value: byCategory.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border p-4"
          >
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-meta text-text-tertiary">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <h2 className="mb-3 text-sub-heading">카테고리별</h2>
      <div className="mb-8 flex flex-wrap gap-2">
        {byCategory.map((cat) => (
          <span
            key={cat.category}
            className="rounded-lg border border-border px-3 py-1.5 text-meta"
          >
            {cat.category}: {cat._count}개
          </span>
        ))}
      </div>

      {/* Recent posts */}
      <h2 className="mb-3 text-sub-heading">최근 발행</h2>
      <div className="divide-y divide-border-light rounded-xl border border-border">
        {recent.map((post) => (
          <Link
            key={post.id}
            href={`/post/${post.slug}`}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-bg-secondary"
          >
            <div>
              <div className="text-card-desc font-medium">{post.title}</div>
              <div className="text-meta text-text-tertiary">
                {post.category} · {post.createdAt.toLocaleDateString("ko-KR")}
              </div>
            </div>
          </Link>
        ))}
        {recent.length === 0 && (
          <div className="px-4 py-8 text-center text-text-muted">
            발행된 글이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
