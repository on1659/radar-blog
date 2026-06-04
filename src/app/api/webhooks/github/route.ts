import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { isAutoWritingEnabled } from "@/lib/auto-writing";
import { parseWebhookPayload, processCommits } from "@/lib/generate-post";
import type { ApiResponse } from "@/types";

const verifySignature = (payload: string, signature: string | null): boolean => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const payload = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!verifySignature(payload, signature)) {
      const res: ApiResponse = { success: false, error: "Invalid signature" };
      return NextResponse.json(res, { status: 401 });
    }

    const event = req.headers.get("x-github-event");

    if (event !== "push") {
      const res: ApiResponse = { success: true, data: { message: `Event '${event}' ignored` } };
      return NextResponse.json(res, { status: 200 });
    }

    const data = JSON.parse(payload);
    const { commits, repository, branch } = parseWebhookPayload(data);

    if (!isAutoWritingEnabled()) {
      const res: ApiResponse = {
        success: true,
        data: {
          message: "Automatic writing is disabled; push event ignored",
          commits: commits.length,
          repository: repository.full_name,
          branch,
        },
      };
      return NextResponse.json(res, { status: 200 });
    }

    // 비동기 처리 — 즉시 202 Accepted 반환
    // Edge Runtime이 아닌 Node.js에서는 waitUntil 대신 fire-and-forget
    processCommits(commits, repository).catch((err) =>
      console.error(`Webhook processing failed for ${repository.full_name}:`, err)
    );

    const res: ApiResponse = {
      success: true,
      data: {
        message: `Accepted ${commits.length} commits from ${repository.full_name} (${branch})`,
        commits: commits.length,
        repository: repository.full_name,
        branch,
      },
    };
    return NextResponse.json(res, { status: 202 });
  } catch (error) {
    const res: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Webhook processing failed",
    };
    return NextResponse.json(res, { status: 500 });
  }
};
