import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const GET = async (req: NextRequest) => {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!session || !user?.isAdmin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const days = parseInt(req.nextUrl.searchParams.get("days") || "7");
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    // 기간 내 총 조회수
    const totalResult = await prisma.dailyAnalytics.aggregate({
      where: { date: { gte: since } },
      _sum: { views: true, botViews: true },
    });
    const totalViews = totalResult._sum.views || 0;
    const totalBotViews = totalResult._sum.botViews || 0;

    // 글별 조회수 Top 10
    const topPostsRaw = await prisma.dailyAnalytics.groupBy({
      by: ["postId"],
      where: { date: { gte: since } },
      _sum: { views: true, botViews: true },
      orderBy: { _sum: { views: "desc" } },
      take: 10,
    });

    const postIds = topPostsRaw.map((p) => p.postId);
    const posts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, title: true, slug: true, category: true },
    });

    const topPosts = topPostsRaw.map((p) => {
      const post = posts.find((pp) => pp.id === p.postId);
      return {
        id: p.postId,
        title: post?.title || "Unknown",
        slug: post?.slug || "",
        category: post?.category || "",
        views: p._sum.views || 0,
        botViews: p._sum.botViews || 0,
      };
    });

    // 일별 조회수 — raw SQL 제거, 인덱스 활용
    const dailyRaw = await prisma.dailyAnalytics.groupBy({
      by: ["date"],
      where: { date: { gte: since } },
      _sum: { views: true, botViews: true },
      orderBy: { date: "asc" },
    });

    const daily = dailyRaw.map((d) => ({
      date: d.date.toLocaleDateString("ko-KR", { month: "short", day: "numeric", timeZone: "Asia/Seoul" }),
      views: d._sum.views || 0,
      botViews: d._sum.botViews || 0,
    }));

    // 카테고리별 조회수
    const categoryRaw = await prisma.$queryRaw<{ category: string; views: bigint }[]>`
      SELECT p.category, SUM(a.views)::bigint as views
      FROM "DailyAnalytics" a
      JOIN "Post" p ON a."postId" = p.id
      WHERE a.date >= ${since}
      GROUP BY p.category
      ORDER BY views DESC
    `;

    const byCategory = categoryRaw.map((c) => ({
      category: c.category,
      views: Number(c.views),
    }));

    return NextResponse.json({
      success: true,
      data: { totalViews, totalBotViews, topPosts, daily, byCategory },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Analytics query failed",
      data: { totalViews: 0, topPosts: [], daily: [], byCategory: [] },
    });
  }
};
