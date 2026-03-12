require("dotenv").config();
const { Octokit } = require("@octokit/rest");
const { PrismaClient } = require("../node_modules/.prisma/client");
const OpenAI = require("openai").default;

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const prisma = new PrismaClient();
const ai = new OpenAI({
  apiKey: process.env.Z_AI_API_KEY,
  baseURL: "https://api.z.ai/api/coding/paas/v4",
});

const SINCE = "2026-03-01T00:00:00Z";
const TRIVIAL = /^(chore|style|docs|fix typo|formatting|lint|bump|merge|revert)/i;

const BRIEF_PROMPT = `당신은 "레이더"라는 개발자의 기술 블로그 커밋 로그 작성자입니다.
커밋 정보를 바탕으로 짧고 실용적인 개발 일지를 작성합니다.

## 문체: "~다" 체. 짧고 직설적으로.
## 구조: 한 줄 요약 → 변경 내용(2~4문장) → 코드 스니펫(선택) → 한 줄 메모
## 제약: 500~1000자, 섹션 헤딩 금지, 코드 블록 최대 1개 20줄 이내

JSON으로 응답: { "title": "...", "content": "...", "tags": ["..."] }`;

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

function readingTime(text) {
  const words = text.replace(/```[\s\S]*?```/g, "").length;
  return Math.max(1, Math.ceil(words / 500));
}

async function main() {
  const repos = await prisma.watchedRepo.findMany({ where: { active: true } });
  console.log(`Found ${repos.length} watched repos`);

  // Get existing commit hashes to skip duplicates
  const existing = await prisma.post.findMany({
    where: { commitHash: { not: null } },
    select: { commitHash: true },
  });
  const existingHashes = new Set(existing.map((p) => p.commitHash));
  console.log(`${existingHashes.size} posts already exist\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const repo of repos) {
    let commits;
    try {
      const res = await octokit.repos.listCommits({
        owner: repo.owner,
        repo: repo.name,
        since: SINCE,
        per_page: 100,
      });
      commits = res.data;
    } catch (e) {
      console.log(`[SKIP] ${repo.name}: ${e.status || e.message}`);
      continue;
    }

    const meaningful = commits.filter(
      (c) => !TRIVIAL.test(c.commit.message) && !existingHashes.has(c.sha)
    );

    if (meaningful.length === 0) {
      continue;
    }

    console.log(`${repo.owner}/${repo.name}: ${meaningful.length} commits`);

    for (const commit of meaningful) {
      try {
        // Get commit detail
        const { data: detail } = await octokit.repos.getCommit({
          owner: repo.owner,
          repo: repo.name,
          ref: commit.sha,
        });

        const files = (detail.files || []).map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: (f.patch || "").slice(0, 500),
        }));

        const filesSummary = files
          .map(
            (f) =>
              `- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})${
                f.patch ? "\n  ```\n  " + f.patch + "\n  ```" : ""
              }`
          )
          .join("\n");

        const totalAdd = files.reduce((s, f) => s + (f.additions || 0), 0);
        const totalDel = files.reduce((s, f) => s + (f.deletions || 0), 0);

        // Call z.ai
        const response = await ai.chat.completions.create({
          model: "glm-5",
          max_tokens: 2000,
          messages: [
            { role: "system", content: BRIEF_PROMPT },
            {
              role: "user",
              content: `레포: ${repo.name}\n커밋: ${detail.commit.message}\n통계: ${files.length} files, +${totalAdd} -${totalDel}\n\n${filesSummary}\n\nJSON으로 응답해.`,
            },
          ],
        });

        const text = response.choices[0]?.message?.content || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.log(`  [ERR] ${commit.sha.slice(0, 7)}: no JSON`);
          errors++;
          continue;
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const usage = response.usage;
        const tokenBadge = usage
          ? `> 🤖 \`${usage.prompt_tokens} in / ${usage.completion_tokens} out / ${usage.total_tokens} total tokens\`\n\n`
          : "";

        const title = parsed.title;
        const content = tokenBadge + parsed.content;
        const tags = parsed.tags || [];
        const slug = `${slugify(title)}-${commit.sha.slice(0, 7)}`;
        const excerpt = content.replace(/[#*`>\[\]]/g, "").slice(0, 200);

        await prisma.post.create({
          data: {
            title,
            content,
            excerpt,
            slug,
            category: "commits",
            tags,
            readingTime: readingTime(content),
            published: true,
            commitHash: commit.sha,
            commitUrl: detail.html_url,
            repoName: repo.name,
            projectSlug: repo.name.toLowerCase(),
            filesChanged: files.length,
            createdAt: new Date(detail.commit.author.date),
          },
        });

        created++;
        console.log(`  [OK] ${commit.sha.slice(0, 7)} → "${title}"`);

        // Rate limit delay
        await new Promise((r) => setTimeout(r, 1500));
      } catch (e) {
        console.log(`  [ERR] ${commit.sha.slice(0, 7)}: ${e.message}`);
        errors++;
      }
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
