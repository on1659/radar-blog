import { prisma } from "./prisma";

export type PublishRunStatus = "posted" | "skipped" | "failed";

export interface PublishRunInput {
  job: string; // "daily-ai" | "claude-ai"
  status: PublishRunStatus;
  reason?: string | null;
  postId?: string | null;
  durationMs?: number;
}

/**
 * 트리거 1회 결과를 PublishRun 테이블에 기록한다.
 * 로깅 실패가 발행 흐름을 절대 막지 않도록 best-effort(try-catch)로 처리한다.
 */
export const recordPublishRun = async (run: PublishRunInput): Promise<void> => {
  try {
    await prisma.publishRun.create({
      data: {
        job: run.job,
        status: run.status,
        reason: run.reason ?? null,
        postId: run.postId ?? null,
        durationMs: run.durationMs ?? null,
      },
    });
  } catch (error) {
    console.error("recordPublishRun failed:", error);
  }
};
