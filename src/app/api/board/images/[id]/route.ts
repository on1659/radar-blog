import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 게시판 이미지 바이너리 서빙. 공개.
 * id는 cuid이고 내용은 불변이므로 immutable 캐시가 정당하다.
 */
export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const image = await prisma.boardImage
    .findUnique({ where: { id }, select: { data: true, mimeType: true } })
    .catch(() => null);

  if (!image) return new NextResponse(null, { status: 404 });

  return new NextResponse(Buffer.from(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(image.data.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
