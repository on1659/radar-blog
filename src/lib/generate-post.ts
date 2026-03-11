import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCommitDetail } from "./github";
import { generateBlogContent } from "./claude";
import { calculateReadingTime } from "./markdown";

const DAILY_POST_CAP = 10;

interface CommitData {
  id: string;
  message: string;
  timestamp?: string;
  added?: string[];
  removed?: string[];
  modified?: string[];
}

interface RepoData {
  owner: { login: string };
  name: string;
  full_name: string;
}

export const parseWebhookPayload = (body: Record<string, unknown>) => {
  const repository = body.repository as RepoData;
  const ref = body.ref as string;
  const commits = (body.commits || []) as CommitData[];

  const branch = ref?.replace("refs/heads/", "") || "main";

  return { repository, branch, commits };
};

export const processCommits = async (
  commits: CommitData[],
  repository: RepoData
) => {
  const owner = repository.owner.login;
  const repo = repository.name;

  // 감시 중인 레포인지 확인
  const watchedRepo = await prisma.watchedRepo.findUnique({
    where: { owner_name: { owner, name: repo } },
  });

  if (!watchedRepo?.active) {
    console.log(`Repo ${repository.full_name} is not being watched. Skipping.`);
    return { processed: 0, skipped: true };
  }

  // 오늘 이미 생성된 글 수 확인 (daily cap)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = await prisma.post.count({
    where: { category: "commits", createdAt: { gte: todayStart } },
  });

  if (todayCount >= DAILY_POST_CAP) {
    console.log(`Daily cap reached (${todayCount}/${DAILY_POST_CAP}). Skipping.`);
    return { processed: 0, skipped: true };
  }

  let processed = 0;
  const trivialPatterns = /^(chore|style|docs|fix typo|formatting|lint|bump|merge|revert)/i;

  for (const commit of commits) {
    if (todayCount + processed >= DAILY_POST_CAP) {
      console.log(`Daily cap reached during processing. Stopping.`);
      break;
    }

    // 사소한 커밋 스킵 (30자 조건 제거 — 패턴 매칭만으로 필터링)
    if (trivialPatterns.test(commit.message)) {
      console.log(`Skipping trivial commit: ${commit.id.slice(0, 7)}`);
      continue;
    }

    try {
      const detail = await getCommitDetail(owner, repo, commit.id);

      // 파일별 patch 앞 500자만 추출 (토큰 절약)
      const filesSummary = detail.files.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch?.slice(0, 500),
      }));

      const { title, content, tags } = await generateBlogContent({
        commitMessage: detail.message,
        diff: "",
        repoName: repo,
        filesChanged: filesSummary,
        customPrompt: watchedRepo.promptTemplate || undefined,
      });

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 100);

      const readingTime = calculateReadingTime(content);
      const excerpt = content.replace(/[#*`>\[\]]/g, "").slice(0, 200);

      await prisma.post.create({
        data: {
          title,
          content,
          excerpt,
          slug: `${slug}-${commit.id.slice(0, 7)}`,
          category: "commits",
          tags,
          readingTime,
          published: watchedRepo.autoPublish,
          commitHash: commit.id,
          commitUrl: detail.url,
          repoName: repo,
          projectSlug: repo.toLowerCase(),
          filesChanged: detail.files.length,
        },
      });

      processed++;
      console.log(`Generated post for commit ${commit.id.slice(0, 7)}`);
    } catch (error) {
      console.error(`Failed to process commit ${commit.id}:`, error);
    }
  }

  // 글이 생성되었으면 ISR 캐시 갱신
  if (processed > 0) {
    try {
      revalidatePath("/");
      revalidatePath("/commits");
      revalidatePath(`/commits/${repo.toLowerCase()}`);
      console.log(`Revalidated paths after ${processed} posts created.`);
    } catch {
      console.error("Revalidation failed, pages will update within 1 hour.");
    }
  }

  return { processed, skipped: false };
};
