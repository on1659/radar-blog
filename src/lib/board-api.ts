import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getBoardSession, type BoardSessionUser } from "@/lib/board-auth";
import { checkRateLimit, BOARD_RATE_LIMITS } from "@/lib/rate-limit";
import type { ApiResponse } from "@/types";

/**
 * 게시판 API 에러 코드 (클라이언트가 분기하는 값):
 * - LOGIN_REQUIRED(401): 미로그인
 * - GITHUB_LOGIN_REQUIRED(403): 세션은 있으나 GitHub 재로그인 필요 (구 세션 / credentials 관리자)
 * - RATE_LIMITED(429), FORBIDDEN(403), NOT_FOUND(404)
 */
export const boardError = (error: string, status: number) =>
  NextResponse.json<ApiResponse>({ success: false, error }, { status });

/** 쓰기 계열 공통 관문: GitHub 로그인 + rate limit (유저 키 주력, IP 키는 3배 용량 보조) */
export const requireBoardWriter = async (
  req: NextRequest,
  route: keyof typeof BOARD_RATE_LIMITS
): Promise<{ ok: true; user: BoardSessionUser } | { ok: false; res: NextResponse }> => {
  const session = await getBoardSession();
  if (session.kind === "none") return { ok: false, res: boardError("LOGIN_REQUIRED", 401) };
  if (session.kind === "no-github") {
    return { ok: false, res: boardError("GITHUB_LOGIN_REQUIRED", 403) };
  }

  const limits = BOARD_RATE_LIMITS[route];
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userOk = checkRateLimit(`${route}:${session.user.githubId}`, limits);
  const ipOk = checkRateLimit(`${route}:ip:${ip}`, {
    capacity: limits.capacity * 3,
    refillPerMin: limits.refillPerMin * 3,
  });
  if (!userOk || !ipOk) return { ok: false, res: boardError("RATE_LIMITED", 429) };

  return { ok: true, user: session.user };
};
