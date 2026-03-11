import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRepoWebhook } from "@/lib/github";
import type { ApiResponse } from "@/types";

const requireAdmin = async () => {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  return session && user?.isAdmin;
};

export const GET = async () => {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const repos = await prisma.watchedRepo.findMany({ orderBy: { createdAt: "desc" } });
  const res: ApiResponse = { success: true, data: repos };
  return NextResponse.json(res);
};

export const POST = async (req: NextRequest) => {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { owner, name, branch = "main", autoPublish = false, promptTemplate } = await req.json();
  if (!owner || !name) {
    return NextResponse.json({ success: false, error: "owner and name are required" }, { status: 400 });
  }

  let githubHookId: number | null = null;
  try {
    githubHookId = await createRepoWebhook(owner, name);
  } catch (err) {
    console.error(`GitHub webhook 생성 실패 (${owner}/${name}):`, err);
  }

  const repo = await prisma.watchedRepo.create({
    data: { owner, name, branch, autoPublish, promptTemplate, githubHookId },
  });

  const res: ApiResponse = {
    success: true,
    data: { ...repo, webhookCreated: githubHookId !== null },
  };
  return NextResponse.json(res, { status: 201 });
};
