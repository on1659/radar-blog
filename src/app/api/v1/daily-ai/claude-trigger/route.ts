import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { isAutoWritingEnabled } from "@/lib/auto-writing";
import { generateClaudePost } from "@/lib/generate-daily-ai";
import { recordPublishRun } from "@/lib/publish-run";
import type { ApiResponse } from "@/types";

export const maxDuration = 300;

const JOB = "claude-ai";

export const POST = async (req: NextRequest) => {
  const authResult = await authenticateApiKey(req);
  if (!authResult.authenticated) return authResult.response!;

  if (!isAutoWritingEnabled()) {
    const body: ApiResponse = {
      success: true,
      data: { skipped: true, reason: "Automatic writing is disabled" },
    };
    return NextResponse.json(body);
  }

  const startedAt = Date.now();
  try {
    const result = await generateClaudePost();

    if (result.skipped) {
      await recordPublishRun({ job: JOB, status: "skipped", reason: result.reason, durationMs: Date.now() - startedAt });
      const body: ApiResponse = {
        success: true,
        data: { skipped: true, reason: result.reason },
      };
      return NextResponse.json(body);
    }

    await recordPublishRun({ job: JOB, status: "posted", postId: result.postId, durationMs: Date.now() - startedAt });
    const body: ApiResponse = {
      success: true,
      data: { postId: result.postId, skipped: false },
    };
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate Claude post";
    await recordPublishRun({ job: JOB, status: "failed", reason: message, durationMs: Date.now() - startedAt });
    console.error("Claude AI trigger failed:", error);
    const body: ApiResponse = {
      success: false,
      error: message,
    };
    return NextResponse.json(body, { status: 500 });
  }
};
