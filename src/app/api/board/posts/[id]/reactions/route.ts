import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { boardError, requireBoardWriter } from "@/lib/board-api";
import { ensureBoardUser } from "@/lib/board-auth";
import { isBoardEmoji } from "@/lib/board";
import type { ApiResponse } from "@/types";

/** 리액션 토글. 응답으로 최신 집계(counts)와 내 리액션(mine)을 돌려준다. */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const gate = await requireBoardWriter(req, "reaction");
  if (!gate.ok) return gate.res;
  const user = gate.user;

  try {
    const { id: postId } = await params;
    const post = await prisma.boardPost.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return boardError("NOT_FOUND", 404);

    const raw = await req.json();
    const emoji = typeof raw.emoji === "string" ? raw.emoji : "";
    if (!isBoardEmoji(emoji)) return boardError("INVALID_EMOJI", 400);

    await prisma.$transaction(async (tx) => {
      await ensureBoardUser(tx, user);
      const removed = await tx.boardReaction.deleteMany({
        where: { postId, userId: user.githubId, emoji },
      });
      if (removed.count === 0) {
        await tx.boardReaction.create({ data: { postId, userId: user.githubId, emoji } });
      }
    });

    const rows = await prisma.boardReaction.findMany({
      where: { postId },
      select: { emoji: true, userId: true },
    });
    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.emoji] = (counts[row.emoji] ?? 0) + 1;
    const mine = rows.filter((row) => row.userId === user.githubId).map((row) => row.emoji);

    return NextResponse.json<ApiResponse>({ success: true, data: { counts, mine } });
  } catch (error) {
    if (error instanceof SyntaxError) return boardError("INVALID_JSON", 400);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : "Failed to toggle reaction" },
      { status: 500 }
    );
  }
};
