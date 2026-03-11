import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteRepoWebhook } from "@/lib/github";
import type { ApiResponse } from "@/types";

const requireAdmin = async () => {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  return session && user?.isAdmin;
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const PUT = async (req: NextRequest, { params }: RouteParams) => {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const repo = await prisma.watchedRepo.update({ where: { id }, data: body });
  const res: ApiResponse = { success: true, data: repo };
  return NextResponse.json(res);
};

export const DELETE = async (_req: NextRequest, { params }: RouteParams) => {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const repo = await prisma.watchedRepo.findUnique({ where: { id } });

  if (repo?.githubHookId) {
    try {
      await deleteRepoWebhook(repo.owner, repo.name, repo.githubHookId);
    } catch (err) {
      console.error(`GitHub webhook 삭제 실패:`, err);
    }
  }

  await prisma.watchedRepo.delete({ where: { id } });

  const res: ApiResponse = { success: true };
  return NextResponse.json(res);
};
