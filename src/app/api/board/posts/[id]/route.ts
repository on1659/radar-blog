import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { boardError } from "@/lib/board-api";
import { getBoardSession } from "@/lib/board-auth";
import type { ApiResponse } from "@/types";

/** 글 삭제 — 본인 또는 관리자. Cascade로 댓글·리액션·이미지가 함께 소멸한다. */
export const DELETE = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const session = await getBoardSession();
  if (session.kind === "none") return boardError("LOGIN_REQUIRED", 401);
  const isAdmin = session.kind === "ok" ? session.user.isAdmin : session.isAdmin;
  const githubId = session.kind === "ok" ? session.user.githubId : null;

  try {
    const { id } = await params;
    const post = await prisma.boardPost.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) return boardError("NOT_FOUND", 404);
    if (!isAdmin && post.authorId !== githubId) return boardError("FORBIDDEN", 403);

    await prisma.boardPost.delete({ where: { id } });
    return NextResponse.json<ApiResponse>({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete post" },
      { status: 500 }
    );
  }
};
