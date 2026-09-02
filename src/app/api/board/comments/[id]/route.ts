import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { boardError } from "@/lib/board-api";
import { getBoardSession } from "@/lib/board-auth";
import type { ApiResponse } from "@/types";

/** 댓글 삭제 — 본인 또는 관리자 */
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
    const comment = await prisma.boardComment.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!comment) return boardError("NOT_FOUND", 404);
    if (!isAdmin && comment.authorId !== githubId) return boardError("FORBIDDEN", 403);

    await prisma.boardComment.delete({ where: { id } });
    return NextResponse.json<ApiResponse>({ success: true, data: { id } });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete comment" },
      { status: 500 }
    );
  }
};
