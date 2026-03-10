import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const content = `## 블로그 API가 있다

이더.dev는 REST API를 통해 외부에서 글을 발행할 수 있다. GitHub Webhook으로 커밋 기반 자동 발행도 되지만, 직접 API를 호출해서 원하는 글을 올리는 것도 가능하다.

API Key 인증 방식이라 키 없이는 글을 올릴 수 없다. 읽기(GET)는 누구나 가능하고, 쓰기(POST)만 인증이 필요하다.

## API Key 발급

관리자 페이지(\`/admin/settings\`)에서 API Key를 발급받는다.

\`\`\`
1. /admin/settings 접속
2. "API Key 관리" 섹션에서 이름 입력
3. "발급" 클릭
4. 생성된 키 복사 (다시 볼 수 없다)
\`\`\`

발급받은 키는 \`Authorization: Bearer <KEY>\` 형태로 요청 헤더에 넣으면 된다.

## 글 발행 (POST)

\`\`\`bash
POST /api/v1/posts
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
\`\`\`

### 요청 Body

\`\`\`json
{
  "title": "글 제목",
  "content": "마크다운 본문 (## 헤딩, 코드블록 등 지원)",
  "category": "articles",
  "tags": ["태그1", "태그2"],
  "published": true
}
\`\`\`

**필수 필드:** \`title\`, \`content\`, \`category\`

**카테고리 종류:** \`commits\` | \`articles\` | \`techlab\` | \`casual\`

### 선택 필드

| 필드 | 설명 |
|------|------|
| \`slug\` | URL 슬러그 (미지정 시 제목에서 자동 생성) |
| \`subtitle\` | 부제목 |
| \`excerpt\` | 요약문 (미지정 시 본문 앞 200자) |
| \`coverImage\` | 커버 이미지 URL |
| \`published\` | 발행 여부 (기본 false, true로 해야 공개) |
| \`tags\` | 태그 배열 |
| \`repoName\` | GitHub 레포 이름 (커밋 기반 글용) |
| \`commitHash\` | 커밋 해시 |
| \`commitUrl\` | 커밋 URL |
| \`filesChanged\` | 변경된 파일 수 |

## curl 예시

\`\`\`bash
curl -X POST https://radar-blog.up.railway.app/api/v1/posts \\
  -H "Authorization: Bearer sk-abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "테스트 글",
    "content": "## 제목\\n본문 내용입니다.",
    "category": "articles",
    "tags": ["test"],
    "published": true
  }'
\`\`\`

### 성공 응답 (201)

\`\`\`json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "slug": "테스트-글",
    "title": "테스트 글",
    "published": true,
    "createdAt": "2026-03-10T..."
  }
}
\`\`\`

### 실패 응답 (401)

\`\`\`json
{
  "success": false,
  "error": "Invalid API key"
}
\`\`\`

## 글 목록 조회 (GET)

인증 없이 누구나 조회 가능하다.

\`\`\`bash
GET /api/v1/posts?category=articles&published=true&page=1&limit=20
\`\`\`

| 파라미터 | 설명 |
|----------|------|
| \`category\` | 카테고리 필터 |
| \`tag\` | 태그 필터 |
| \`published\` | true/false |
| \`page\` | 페이지 번호 (기본 1) |
| \`limit\` | 페이지당 개수 (기본 20, 최대 100) |

## GitHub Webhook 자동 발행

API를 직접 호출하지 않아도, GitHub 레포에 push하면 자동으로 블로그 글이 생성된다.

\`\`\`
1. /admin/settings에서 GitHub 레포 등록
2. GitHub 레포 → Settings → Webhooks → Add webhook
3. Payload URL: https://radar-blog.up.railway.app/api/webhooks/github
4. Content type: application/json
5. Secret: GITHUB_WEBHOOK_SECRET 값과 동일하게
6. Events: Just the push event
\`\`\`

커밋하면 AI(GLM-4)가 커밋 내용을 분석해서 블로그 글을 자동 생성한다.

> API Key 하나면 어디서든 글을 올릴 수 있다. 자동화든, 수동이든.`;

async function main() {
  const post = await prisma.post.create({
    data: {
      title: "이더.dev 블로그 API 사용법 — 외부에서 글 발행하기",
      slug: "ether-dev-blog-api-guide",
      category: "articles",
      tags: ["API", "REST", "Blog", "Guide"],
      published: true,
      readingTime: 4,
      excerpt:
        "이더.dev 블로그에 외부에서 글을 발행하는 API 사용법. Bearer token 인증, 요청/응답 형식, curl 예시까지.",
      content,
    },
  });
  console.log("Created post:", post.id, post.slug);
  await prisma.$disconnect();
}

main().catch(console.error);
