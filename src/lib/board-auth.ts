import { auth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export interface BoardSessionUser {
  githubId: string;
  username: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

/**
 * 게시판 관점의 세션 3분류.
 * - none: 미로그인
 * - no-github: 세션은 있으나 githubId 없음 — credentials 관리자, 또는 githubId 도입 전에 발급된 구 GitHub 세션.
 *   작성은 불가(재로그인 유도), 관리자 삭제 권한은 isAdmin으로 별도 판정.
 * - ok: GitHub 로그인 사용자 (작성 가능)
 */
export type BoardSession =
  | { kind: "none" }
  | { kind: "no-github"; isAdmin: boolean }
  | { kind: "ok"; user: BoardSessionUser };

export const getBoardSession = async (): Promise<BoardSession> => {
  const session = await auth();
  if (!session?.user) return { kind: "none" };
  const { githubId, githubUsername, image, isAdmin } = session.user;
  if (!githubId || !githubUsername) return { kind: "no-github", isAdmin: !!isAdmin };
  return {
    kind: "ok",
    user: { githubId, username: githubUsername, avatarUrl: image ?? null, isAdmin: !!isAdmin },
  };
};

/** 쓰기 직전 BoardUser upsert — username/avatar는 매 쓰기마다 최신으로 갱신 */
export const ensureBoardUser = async (
  tx: Prisma.TransactionClient,
  user: BoardSessionUser
) =>
  tx.boardUser.upsert({
    where: { id: user.githubId },
    create: { id: user.githubId, username: user.username, avatarUrl: user.avatarUrl },
    update: { username: user.username, avatarUrl: user.avatarUrl },
  });
