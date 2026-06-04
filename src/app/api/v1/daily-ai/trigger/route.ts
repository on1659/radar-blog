import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { isAutoWritingEnabled } from "@/lib/auto-writing";
import { generateDailyAIPost } from "@/lib/generate-daily-ai";
import type { ApiResponse } from "@/types";

export const maxDuration = 300;

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

  try {
    const result = await generateDailyAIPost();

    if (result.skipped) {
      const body: ApiResponse = {
        success: true,
        data: { skipped: true, reason: result.reason },
      };
      return NextResponse.json(body);
    }

    const body: ApiResponse = {
      success: true,
      data: { postId: result.postId, skipped: false },
    };
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("Daily AI trigger failed:", error);
    const body: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate daily AI post",
    };
    return NextResponse.json(body, { status: 500 });
  }
};
