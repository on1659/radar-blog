import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { boardError, requireBoardWriter } from "@/lib/board-api";
import { ensureBoardUser } from "@/lib/board-auth";
import {
  BOARD_BODY_MAX,
  BOARD_TITLE_MAX,
  isBoardCategory,
  sanitizeBoardText,
} from "@/lib/board";
import type { ApiResponse } from "@/types";

/** 이미지 연결 실패(소유권 위반·이미 연결됨·존재하지 않음)를 롤백으로 구분하기 위한 센티널 */
class ImageLinkError extends Error {}

export const POST = async (req: NextRequest) => {
  const gate = await requireBoardWriter(req, "post");
  if (!gate.ok) return gate.res;
  const user = gate.user;

  try {
    const raw = await req.json();
    const category = typeof raw.category === "string" ? raw.category : "";
    if (!isBoardCategory(category)) return boardError("INVALID_CATEGORY", 400);

    const title = sanitizeBoardText(typeof raw.title === "string" ? raw.title : "");
    const body = sanitizeBoardText(typeof raw.body === "string" ? raw.body : "");
    if (!title || title.length > BOARD_TITLE_MAX) return boardError("INVALID_TITLE", 400);
    if (!body || body.length > BOARD_BODY_MAX) return boardError("INVALID_BODY", 400);

    const imageId = typeof raw.imageId === "string" && raw.imageId ? raw.imageId : null;
    if (category === "showcase" && !imageId) return boardError("IMAGE_REQUIRED", 400);

    const post = await prisma.$transaction(async (tx) => {
      await ensureBoardUser(tx, user);
      const created = await tx.boardPost.create({
        data: { category, title, body, authorId: user.githubId },
        select: { id: true },
      });
      if (imageId) {
        // 소유권 + 미연결 상태를 원자적으로 검증하며 연결
        const linked = await tx.boardImage.updateMany({
          where: { id: imageId, uploaderId: user.githubId, postId: null },
          data: { postId: created.id },
        });
        if (linked.count === 0) throw new ImageLinkError();
      }
      return created;
    });

    return NextResponse.json<ApiResponse>({ success: true, data: post }, { status: 201 });
  } catch (error) {
    if (error instanceof ImageLinkError) return boardError("IMAGE_NOT_LINKABLE", 400);
    if (error instanceof SyntaxError) return boardError("INVALID_JSON", 400);
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : "Failed to create post" },
      { status: 500 }
    );
  }
};
