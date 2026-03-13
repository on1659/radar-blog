import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const requireAdmin = async () => {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  return session && user?.isAdmin;
};

export const POST = async () => {
  if (!(await requireAdmin())) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true },
    });

    // 2-pass: 먼저 임시 slug로 변경 후, 최종 번호로 재설정 (unique constraint 회피)
    let updated = 0;
    const toUpdate = posts
      .map((p, i) => ({ id: p.id, oldSlug: p.slug, newSlug: String(i + 1) }))
      .filter((p) => p.oldSlug !== p.newSlug);

    // Pass 1: 충돌 방지용 임시 slug
    for (const p of toUpdate) {
      await prisma.post.update({
        where: { id: p.id },
        data: { slug: `__temp_${p.id}` },
      });
    }

    // Pass 2: 최종 번호 할당
    for (const p of toUpdate) {
      await prisma.post.update({
        where: { id: p.id },
        data: { slug: p.newSlug },
      });
      updated++;
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { total: posts.length, updated },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : "Failed to renumber" },
      { status: 500 }
    );
  }
};
