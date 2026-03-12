import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { octokit, createRepoWebhook } from "@/lib/github";
import type { ApiResponse } from "@/types";

const OWNER = "on1659";
const MONTHS = 4;

export const POST = async () => {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  if (!session || !user?.isAdmin) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - MONTHS);

  // GitHub에서 최근 활동 레포 가져오기
  const { data: allRepos } = await octokit.repos.listForUser({
    username: OWNER,
    per_page: 100,
    sort: "pushed",
  });

  const activeRepos = allRepos.filter(
    (r) => new Date(r.pushed_at ?? 0) > cutoff && r.name !== "radar-blog"
  );

  // DB에 이미 등록된 레포 목록
  const existing = await prisma.watchedRepo.findMany({
    where: { owner: OWNER },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((r) => r.name));

  const added: string[] = [];
  const errors: string[] = [];

  for (const repo of activeRepos) {
    if (existingNames.has(repo.name)) continue;

    let githubHookId: number | null = null;
    try {
      githubHookId = await createRepoWebhook(OWNER, repo.name);
    } catch (err) {
      errors.push(`${repo.name}: webhook 실패 - ${err instanceof Error ? err.message : "unknown"}`);
    }

    try {
      await prisma.watchedRepo.create({
        data: { owner: OWNER, name: repo.name, branch: "main", autoPublish: true, githubHookId },
      });
      added.push(repo.name);
    } catch (err) {
      errors.push(`${repo.name}: DB 등록 실패 - ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  const res: ApiResponse = {
    success: true,
    data: { added, errors, total: activeRepos.length, newCount: added.length },
  };
  return NextResponse.json(res);
};

// Railway cron 또는 외부 cron 호출용 (secret 헤더로 인증)
export const GET = async (req: Request) => {
  const secret = new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // POST 로직 재사용
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - MONTHS);

  const { data: allRepos } = await octokit.repos.listForUser({
    username: OWNER,
    per_page: 100,
    sort: "pushed",
  });

  const activeRepos = allRepos.filter(
    (r) => new Date(r.pushed_at ?? 0) > cutoff && r.name !== "radar-blog"
  );

  const existing = await prisma.watchedRepo.findMany({
    where: { owner: OWNER },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((r) => r.name));

  const added: string[] = [];

  for (const repo of activeRepos) {
    if (existingNames.has(repo.name)) continue;

    let githubHookId: number | null = null;
    try {
      githubHookId = await createRepoWebhook(OWNER, repo.name);
    } catch { /* webhook 실패해도 계속 */ }

    try {
      await prisma.watchedRepo.create({
        data: { owner: OWNER, name: repo.name, branch: "main", autoPublish: true, githubHookId },
      });
      added.push(repo.name);
    } catch { /* 중복이면 스킵 */ }
  }

  return NextResponse.json({ success: true, data: { added, newCount: added.length } });
};
