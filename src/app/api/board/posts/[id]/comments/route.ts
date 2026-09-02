import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { boardError, requireBoardWriter } from "@/lib/board-api";
import { ensureBoardUser } from "@/lib/board-auth";
import { BOARD_COMMENT_MAX, sanitizeBoardText } from "@/lib/board";
import type { ApiResponse } from "@/types";

export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const gate = await requireBoardWriter(req, "comment");
  if (!gate.ok) return gate.res;
  const user = gate.user;

  try {
    const { id: postId } = await params;
    const post = await prisma.boardPost.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) return boardError("NOT_FOUND", 404);

    const raw = await req.json();
    const body = sanitizeBoardText(typeof raw.body === "string" ? raw.body : "");
    if (!body || body.length > BOARD_COMMENT_MAX) return boardError("INVALID_BODY", 400);

    const comment = await prisma.$transaction(async (tx) => {
      await ensureBoardUser(tx, user);
      return tx.boardComment.create({
        data: { postId, authorId: user.githubId, body },
        select: {
          id: true,
          body: true,
          createdAt: true,
          author: { select: { id: true, username: true, avatarUrl: true } },
        },
      });
    });

    return NextResponse.json<ApiResponse>({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return boardError("INVALID_JSON", 400);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : "Failed to create comment" },
      { status: 500 }
    );
  }
};
