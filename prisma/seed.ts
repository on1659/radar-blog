import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const posts = [
  {
    slug: "socketio-team-assignment-refactoring",
    title: "Socket.IO 팀 배정 로직 리팩토링 — Map 기반 O(1) 탐색으로 전환",
    excerpt: "기존 배열 순회 방식의 팀 배정 로직을 Map 자료구조로 전환했다. 100명 동시 접속 기준으로 배정 시간이 120ms에서 3ms로 줄었다.",
    content: "# Socket.IO 팀 배정 로직 리팩토링\n\n기존 배열 순회 방식의 팀 배정 로직을 Map 자료구조로 전환했다.\n\n## 문제 상황\n\n100명 동시 접속 시 배정 시간이 120ms까지 증가했다.\n\n## 해결\n\nMap 기반으로 전환하여 O(1) 탐색이 가능해졌다.",
    category: "commits" as const,
    tags: ["Socket.IO", "리팩토링"],
    readingTime: 5,
    published: true,
    commitHash: "a1b2c3d",
    repoName: "LAMDiceBot",
    projectSlug: "lamdicebot",
    filesChanged: 3,
    createdAt: new Date("2026-03-09"),
  },
  {
    slug: "github-commit-to-blog-pipeline",
    title: "GitHub 커밋을 블로그 글로 자동 변환하는 파이프라인 만들기",
    subtitle: "Webhook → Claude API → 자동 발행까지, 삽질 포함 전체 과정",
    excerpt: "커밋 로그를 Claude API로 분석해서 기술 블로그 글을 자동 생성하는 시스템을 구축했다. Webhook부터 발행까지 전 과정을 정리한다.",
    content: "# GitHub 커밋을 블로그 글로 자동 변환하는 파이프라인 만들기\n\n코드를 쓰고 나면 그걸 정리해서 글로 쓰는 게 가장 귀찮은 일이었다.\n\n## 왜 이걸 만들었나\n\n개발자 블로그의 가장 큰 적은 귀찮음이다.\n\n## 전체 아키텍처\n\n구조는 단순하다. GitHub Webhook으로 push 이벤트를 받고, Octokit으로 커밋 데이터를 수집한다.\n\n## 삽질: diff 데이터 전처리\n\n처음에는 커밋 diff 전체를 Claude API에 던졌다.\n\n## AI 프롬프트 설계\n\n글이 AI스러워 보이면 안 된다.",
    category: "articles" as const,
    tags: ["AI", "Claude", "자동화"],
    readingTime: 12,
    published: true,
    repoName: "git2blog",
    projectSlug: "git2blog",
    createdAt: new Date("2026-03-07"),
  },
  {
    slug: "strix-halo-local-llm-benchmark",
    title: "Strix Halo 미니PC에서 로컬 LLM 추론 벤치마크 — Llama 3.1 70B 실험",
    excerpt: "GMKtec EVO-X2에 96GB 통합 메모리를 활용해서 Llama 3.1 70B를 로컬에서 돌려봤다. 토큰 생성 속도와 전력 소비를 API 호출과 비교.",
    content: "# Strix Halo 미니PC에서 로컬 LLM 추론 벤치마크\n\nGMKtec EVO-X2에 96GB 통합 메모리를 활용해서 Llama 3.1 70B를 로컬에서 돌려봤다.\n\n## 하드웨어 스펙\n\nStrix Halo + 96GB LPDDR5X.\n\n## 벤치마크 결과\n\n토큰 생성 속도: 약 12 tok/s.",
    category: "articles" as const,
    tags: ["로컬LLM", "벤치마크"],
    readingTime: 15,
    published: true,
    createdAt: new Date("2026-03-05"),
  },
  {
    slug: "han-river-riding-thoughts",
    title: "한강 라이딩하다 든 생각 — 게임 프로그래머가 AI를 하는 이유",
    excerpt: "퇴근 후 라피에르 타고 한강을 달리면서 정리한 생각들. 왜 안정적인 게임 개발을 두고 사이드로 AI를 파는지.",
    content: "# 한강 라이딩하다 든 생각\n\n퇴근 후 라피에르 타고 한강을 달리면서 정리한 생각들.\n\n## 게임 프로그래머가 AI를?\n\n왜 안정적인 게임 개발을 두고 사이드로 AI를 파는지.",
    category: "casual" as const,
    tags: ["회고"],
    readingTime: 4,
    published: true,
    createdAt: new Date("2026-03-03"),
  },
  {
    slug: "wedding-invitation-drag-drop-upload",
    title: "드래그앤드롭 사진 업로드 + 테마 커스터마이징 구현",
    excerpt: "모바일 청첩장에 사진 업로드 기능을 추가했다. react-dnd-kit으로 순서 변경까지 지원하고, 테마 컬러를 실시간으로 미리볼 수 있게 했다.",
    content: "# 드래그앤드롭 사진 업로드 + 테마 커스터마이징\n\n모바일 청첩장에 사진 업로드 기능을 추가했다.\n\n## react-dnd-kit 적용\n\n순서 변경까지 지원하고, 테마 컬러를 실시간으로 미리볼 수 있게 했다.",
    category: "commits" as const,
    tags: ["React", "DnD"],
    readingTime: 6,
    published: true,
    commitHash: "f4e5d6c",
    repoName: "wedding-invitation",
    projectSlug: "wedding-invitation",
    filesChanged: 5,
    createdAt: new Date("2026-03-01"),
  },
  {
    slug: "claude-code-workflow",
    title: "Claude Code 실전 워크플로우 — CLAUDE.md 최적화부터 대형 파일 분리까지",
    excerpt: "LAMDiceBot 개발에 Claude Code를 6개월 쓰면서 쌓인 노하우. dangerously-skip-permissions 플래그의 진짜 의미와 효율적인 작업 규칙.",
    content: "# Claude Code 실전 워크플로우\n\nLAMDiceBot 개발에 Claude Code를 6개월 쓰면서 쌓인 노하우.\n\n## CLAUDE.md 최적화\n\n핵심은 AI에게 맥락을 정확히 전달하는 것이다.",
    category: "articles" as const,
    tags: ["Claude Code", "DX"],
    readingTime: 10,
    published: true,
    repoName: "Claude Code",
    createdAt: new Date("2026-02-28"),
  },
];

async function main() {
  console.log("Seeding database...");

  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: post,
      create: post,
    });
  }

  console.log(`Seeded ${posts.length} posts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
