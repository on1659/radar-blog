import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { boardError, requireBoardWriter } from "@/lib/board-api";
import { ensureBoardUser } from "@/lib/board-auth";
import { MAX_IMAGE_BYTES, MAX_PENDING_IMAGES, sniffImageMime } from "@/lib/board";
import type { ApiResponse } from "@/types";

/** 클라이언트가 보낸 표시용 치수 참고값 검증 (신뢰하지 않아도 되는 메타) */
const parseDimension = (value: FormDataEntryValue | null): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 10000 ? n : null;
};

export const POST = async (req: NextRequest) => {
  const gate = await requireBoardWriter(req, "image");
  if (!gate.ok) return gate.res;
  const user = gate.user;

  try {
    // 기회적 고아 스윕: 24시간 넘게 글에 연결되지 않은 이미지 정리 (크론 대체)
    await prisma.boardImage
      .deleteMany({
        where: { postId: null, createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } },
      })
      .catch(() => {});

    const pending = await prisma.boardImage.count({
      where: { uploaderId: user.githubId, postId: null },
    });
    if (pending >= MAX_PENDING_IMAGES) {
      return boardError("TOO_MANY_PENDING_IMAGES", 400);
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return boardError("FILE_REQUIRED", 400);
    if (file.size > MAX_IMAGE_BYTES) return boardError("FILE_TOO_LARGE", 400);

    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf.byteLength === 0) return boardError("FILE_REQUIRED", 400);
    if (buf.byteLength > MAX_IMAGE_BYTES) return boardError("FILE_TOO_LARGE", 400);

    const mime = sniffImageMime(buf);
    if (!mime) return boardError("UNSUPPORTED_IMAGE_TYPE", 400);

    const image = await prisma.$transaction(async (tx) => {
      await ensureBoardUser(tx, user);
      return tx.boardImage.create({
        data: {
          data: buf,
          mimeType: mime,
          size: buf.byteLength,
          width: parseDimension(formData.get("width")),
          height: parseDimension(formData.get("height")),
          uploaderId: user.githubId,
        },
        select: { id: true, width: true, height: true },
      });
    });

    return NextResponse.json<ApiResponse>({ success: true, data: image }, { status: 201 });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : "Failed to upload image" },
      { status: 500 }
    );
  }
};
