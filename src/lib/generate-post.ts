import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { getCommitDetail } from "./github";
import { generateBlogContent } from "./claude";
import { calculateReadingTime } from "./markdown";
import { validatePost, logValidation, buildFailureBanner } from "./post-validator";

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
  let publishedCount = 0;
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

      const { title, content, titleEn, contentEn, tags } = await generateBlogContent({
        commitMessage: detail.message,
        diff: "",
        repoName: repo,
        filesChanged: filesSummary,
        customPrompt: watchedRepo.promptTemplate || undefined,
        brief: true,
      });

      const slug = `commits-${crypto.randomUUID().slice(0, 12)}`;

      const readingTime = calculateReadingTime(content);
      const excerpt = content.replace(/[#*`>\[\]]/g, "").slice(0, 200);
      const excerptEn = contentEn ? contentEn.replace(/[#*`>\[\]]/g, "").slice(0, 200) : null;

      // 검수: 콘텐츠 품질 체크 (commit 글은 링크 적으므로 빠르게)
      const validation = await validatePost({
        content,
        title,
        minLength: 200,
        maxLength: 12000,
        skipLinkCheck: true,
      });

      // 검수 실패 → hallucination 카테고리 + 사유 배너, 통과 → commits
      const shouldPublish = validation.passed ? watchedRepo.autoPublish : true;
      const finalContent = validation.passed ? content : buildFailureBanner(validation) + content;
      const finalContentEn = validation.passed ? contentEn : (contentEn ? buildFailureBanner(validation) + contentEn : contentEn);

      const post = await prisma.post.create({
        data: {
          title,
          titleEn: titleEn || null,
          content: finalContent,
          contentEn: finalContentEn || null,
          excerpt,
          excerptEn,
          slug,
          category: validation.passed ? "commits" : "hallucination",
          tags: validation.passed ? tags : [...tags, "검수실패"],
          readingTime,
          published: shouldPublish,
          validationScore: validation.score,
          validationIssues: validation.issues.length > 0 ? JSON.stringify(validation.issues) : null,
          validatedAt: new Date(),
          commitHash: commit.id,
          commitUrl: detail.url,
          repoName: repo,
          projectSlug: repo.toLowerCase(),
          filesChanged: detail.files.length,
        },
      });

      logValidation(post.id, validation);

      // 텍스트 기반 썸네일 URL 세팅 (API route에서 동적 생성)
      await prisma.post.update({
        where: { id: post.id },
        data: { coverImage: `/api/thumbnail/${post.id}` },
      });

      processed++;
      if (shouldPublish) publishedCount++;
      console.log(`Generated post for commit ${commit.id.slice(0, 7)} (validation: ${validation.passed ? "PASS" : "FAIL"})`);
    } catch (error) {
      console.error(`Failed to process commit ${commit.id}:`, error);
    }
  }

  // 실제 published된 글이 있을 때만 ISR 캐시 갱신
  if (publishedCount > 0) {
    try {
      revalidatePath("/");
      revalidatePath("/commits");
      revalidatePath(`/commits/${repo.toLowerCase()}`);
      console.log(`Revalidated paths after ${publishedCount} posts published.`);
    } catch {
      console.error("Revalidation failed, pages will update within 1 hour.");
    }
  }

  return { processed, skipped: false };
};
