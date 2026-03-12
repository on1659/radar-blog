# 레이더 블로그 — Claude Code 빌드 프롬프트

> **사용법:**
> 1. 프로젝트 폴더를 만들고 CLAUDE.md를 루트에 복사
> 2. BLOG_REQUIREMENTS.md, DESIGN_SYSTEM.md, radar-blog-mockup-v2.html도 루트에 복사
> 3. Claude Code를 열고 아래 프롬프트를 **순서대로 하나씩** 입력
> 4. 각 단계가 완료되면 확인 후 다음 단계로

## 모델 선택 가이드 (레이더 참고용 — Claude Code에서 `/model`로 직접 전환)

| 단계 | 모델 | 이유 |
|------|------|------|
| Step 1-1 ~ 1-4 | **Sonnet** | 초기화, DB, 인증, 레이아웃 — 구조 잡기 |
| Step 1-5 ~ 1-6 | **Opus** | 메인 페이지, 글 상세 — 목업 디자인 정밀 구현 |
| Step 1-7 ~ 1-8 | **Sonnet** | 카테고리, 소개 — 기존 컴포넌트 재사용 |
| Step 1-9 ~ 1-11 | **Sonnet** | API, 관리자, SEO — 로직 위주 |
| Step 2-1 | **Sonnet** | Webhook 수신 — 정형화된 패턴 |
| Step 2-2 | **Opus** | AI 글 생성 파이프라인 — 복잡한 로직 설계 |
| Step 2-3 | **Sonnet** | 관리자 강화 — CRUD 위주 |
| Step 3-1 | **Opus** | 통계 대시보드 — 차트 + 데이터 시각화 |
| Step 3-2 ~ 3-4 | **Sonnet** | 시리즈, i18n, 검색 — 기능 추가 |
| Step 3-5 ~ 3-6 | **Sonnet** | 배포, 점검 — 설정 위주 |

> 귀찮으면 그냥 Opus로 전부 밀어도 됨. 비용만 더 나감.

---

## 시작 전 준비

```bash
mkdir radar-blog && cd radar-blog
# CLAUDE.md, BLOG_REQUIREMENTS.md, DESIGN_SYSTEM.md, radar-blog-mockup-v2.html을 여기에 복사
```

---

## Phase 1: MVP (메인 + 글 상세 + 소개 + API)

### Step 1-1: 프로젝트 초기화

```
프로젝트 초기화해줘.

1. Next.js 15 App Router + TypeScript로 프로젝트 생성
2. 필요한 패키지 설치:
   - tailwindcss, @tailwindcss/typography
   - prisma, @prisma/client
   - next-auth (Auth.js v5)
   - next-mdx-remote, rehype-pretty-code, shiki, remark-gfm
   - next-themes (다크모드)
   - lucide-react (아이콘)
   - fuse.js (검색)
3. Tailwind 설정 — DESIGN_SYSTEM.md의 컬러, 폰트 변수를 tailwind.config.ts에 반영
4. globals.css에 CSS 변수 정의 (라이트/다크 모드 전부)
5. Pretendard Variable + JetBrains Mono 폰트 설정
6. .env.example 생성
7. tsconfig.json strict mode

CLAUDE.md의 기술 스택과 디렉토리 구조를 정확히 따라줘.
```

### Step 1-2: Prisma 스키마 + DB 설정

```
Prisma 스키마를 만들어줘.

필요한 모델:
- Post: id, title, subtitle, slug(unique), content(markdown), category(enum: COMMITS/ARTICLES/TECHLAB/CASUAL), tags(String[]), coverImage, published(bool), locale(ko/en), readingTime, projectSlug, commitHash, commitRepo, commitFilesChanged, seriesId, createdAt, updatedAt
- Series: id, title, slug(unique), description, posts(relation)
- ApiKey: id, name, key(unique+hashed), lastUsedAt, createdAt, active(bool)
- WatchedRepo: id, owner, name, branch, autoPublish(bool), promptTemplate, categoryMapping, createdAt
- Analytics: id, postId, views, referrer, userAgent, createdAt (간단한 내부 트래킹용)

prisma/schema.prisma 생성하고, lib/prisma.ts에 singleton 클라이언트 만들어줘.
DB는 PostgreSQL (Railway), DATABASE_URL은 .env에서 읽어.
```

### Step 1-3: 인증 (NextAuth + GitHub OAuth)

```
NextAuth.js (Auth.js v5) 설정해줘.

- GitHub OAuth provider
- 관리자 체크: ADMIN_GITHUB_ID 환경변수와 로그인한 사용자의 GitHub username 비교
- lib/auth.ts에 설정 파일
- app/api/auth/[...nextauth]/route.ts 생성
- 관리자 세션에 isAdmin: boolean 포함
- 미들웨어: /admin 경로는 관리자만 접근 가능
```

### Step 1-4: 레이아웃 + 네비게이션 + 푸터

```
전역 레이아웃을 만들어줘. radar-blog-mockup-v2.html을 참고해서 정확한 디자인으로.

1. app/layout.tsx — ThemeProvider(next-themes) + NavBar + Footer + 메타데이터
2. components/layout/NavBar.tsx:
   - "레이더.dev" 로고 (점에 accent 색)
   - Blog, Projects, About 링크
   - 검색 아이콘 버튼, 다크모드 토글
   - 모바일: 햄버거 메뉴
   - sticky, 하단 보더 구분선
3. components/layout/Footer.tsx:
   - 카카오테크 스타일 사이트맵 푸터
   - 왼쪽: 로고 + 카피라이트
   - 오른쪽: Links, Categories 컬럼
4. components/layout/ThemeToggle.tsx:
   - Sun/Moon 아이콘 전환
   - 시스템 설정 감지 + 수동 토글

목업 HTML의 CSS를 Tailwind 클래스로 변환해서 만들어줘. 색상은 CSS 변수 참조.
```

### Step 1-5: 메인 페이지

```
메인 페이지를 만들어줘. 목업의 메인 페이지와 동일하게.

1. app/page.tsx — Server Component
2. components/home/HeroBanner.tsx:
   - 다크 배경 + 그라데이션 글로우 효과
   - "코드를 쓰면, 글이 된다." 제목 (em 태그에 그라데이션 텍스트)
   - 부제목
3. components/home/CategoryFilter.tsx ("use client"):
   - pill 칩 버튼: 전체, Commits, Articles, Tech Lab, Casual
   - URL searchParams로 필터 상태 관리 (?category=commits)
   - 활성 칩: 배경 반전
4. components/post/PostList.tsx:
   - Prisma에서 글 목록 조회 (카테고리 필터 적용)
   - 페이지네이션 또는 무한스크롤
5. components/post/PostItem.tsx:
   - 수평 레이아웃: 왼쪽 썸네일(200×130) + 오른쪽 텍스트
   - 썸네일: 카테고리별 그라데이션 배경 + 프로젝트명
   - 카테고리 배지 + 프로젝트명/커밋해시 (commits일 때)
   - 제목(2줄 클램프) + 설명(2줄 클램프) + 메타(작성자·날짜·읽기시간) + 태그
   - hover: 배경색 변경 (shadow 아님)
   - 구분선: border-bottom

"섹션 헤더" 영역도 만들어줘: "최근 게시물" 타이틀 + "전체보기 →" 링크.
목업 HTML의 스타일을 정확히 Tailwind로 변환.
```

### Step 1-6: 글 상세 페이지

```
글 상세 페이지를 만들어줘. 목업의 글 상세와 동일하게.

1. app/post/[slug]/page.tsx:
   - Prisma에서 slug로 글 조회
   - generateMetadata로 SEO 메타 태그
   - 조회수 카운트 (Analytics 모델)
2. components/post/PostDetail.tsx:
   - 상단: 카테고리 배지 + 제목(H1) + 부제목
   - 작성자 아바타(그라데이션 원) + 이름 + 날짜 + 읽기시간
   - 구분선
3. 본문 렌더링 (lib/markdown.ts):
   - next-mdx-remote로 마크다운 → React 변환
   - rehype-pretty-code + shiki (One Dark Pro 테마) 코드 하이라이트
   - remark-gfm (테이블, 취소선 등)
   - 커스텀 컴포넌트: h2/h3에 id 부여 (TOC용), code 인라인 스타일, blockquote 스타일
4. components/post/TableOfContents.tsx ("use client"):
   - 우측 sticky (top: 112px)
   - h2/h3 헤딩 자동 추출
   - IntersectionObserver로 현재 섹션 하이라이트
   - 클릭 시 smooth scroll
   - 1024px 이하에서 숨김
5. 태그 목록 (하단)
6. components/post/PostNav.tsx — 이전/다음 글 카드
7. Giscus 댓글 컴포넌트 (script 태그 또는 @giscus/react)

@tailwindcss/typography의 prose 클래스를 기반으로 하되, DESIGN_SYSTEM.md의 타이포 규칙에 맞게 커스텀.
```

### Step 1-7: 카테고리 페이지들

```
카테고리별 페이지를 만들어줘. 메인 페이지와 같은 PostList를 재사용하되 카테고리가 고정.

1. app/commits/page.tsx — category=COMMITS 고정 필터 + 프로젝트별 서브 필터
2. app/commits/[project]/page.tsx — 특정 프로젝트의 커밋 글 목록
3. app/articles/page.tsx — category=ARTICLES
4. app/techlab/page.tsx — category=TECHLAB + 실험 상태 필터 (진행중/완료/보류)
5. app/casual/page.tsx — category=CASUAL

commits 페이지는 프로젝트별 그룹핑이 핵심:
- 상단에 프로젝트 목록 (WatchedRepo에서 가져오기)
- 프로젝트 선택 시 해당 프로젝트 커밋만 필터
- 프로젝트별 상세 페이지에서는 타임라인처럼 커밋 히스토리 표시
```

### Step 1-8: 소개 페이지 (About)

```
소개 페이지를 만들어줘. 목업의 About 페이지와 동일하게.

app/about/page.tsx:
1. 다크 히어로 섹션:
   - 아바타 (그라데이션 원 + "E")
   - "레이더" + "UE5 C++ 게임 프로그래머" + "AI × 사이드프로젝트 빌더"
   - GitHub, Email, RSS 버튼 (아웃라인 스타일, 다크 배경 위)
2. 본문 섹션 (max-width: 720px):
   - "소개" — 자기소개 텍스트 (목업 내용 그대로)
   - "프로젝트" — 2열 그리드 프로젝트 카드 (LAMDiceBot, git2blog, wedding-invitation, GameForge)
     - 각 카드: 아이콘(그라데이션 원) + 이름 + 설명 + 기술스택 태그
   - "기술 스택" — 뱃지 리스트 (hover 시 accent 색)

소개 텍스트와 프로젝트 데이터는 config/site.ts에 정의해서 관리.
```

### Step 1-9: 외부 발행 API

```
외부 발행 API를 만들어줘. git2blog 등에서 API Key로 글을 올릴 수 있게.

1. lib/api-auth.ts:
   - Bearer token에서 API Key 추출
   - DB에서 해시된 키 조회 + active 체크
   - lastUsedAt 업데이트
   - 인증 실패 시 401 응답

2. app/api/v1/posts/route.ts:
   - POST: 새 글 발행
     - body: { title, content, category, tags, coverImage?, slug?, published?, locale?, projectSlug? }
     - slug 자동 생성 (없으면 title에서 kebab-case)
     - readingTime 자동 계산 (한글 기준 분당 400자)
   - GET: 글 목록 조회 (필터: category, tag, projectSlug, published)
     - 페이지네이션: ?page=1&limit=20

3. app/api/v1/posts/[id]/route.ts:
   - PUT: 글 수정
   - DELETE: 글 삭제

모든 엔드포인트에 api-auth 미들웨어 적용.
응답 형식: { success: boolean, data?: T, error?: string }
```

### Step 1-10: 관리자 페이지 기본

```
관리자 페이지 기본을 만들어줘.

1. app/admin/layout.tsx:
   - NextAuth 세션 체크 → isAdmin이 아니면 리다이렉트
   - 관리자 사이드바 네비게이션: 대시보드, 글 관리, 설정
2. app/admin/page.tsx (대시보드):
   - 총 글 수, 카테고리별 글 수, 최근 7일 발행 수
   - 최근 발행된 글 5개 리스트
3. app/admin/posts/page.tsx (글 관리):
   - 글 목록 테이블: 제목, 카테고리, 상태(발행/임시저장), 날짜
   - 필터: 카테고리, 상태
   - 삭제 버튼 (확인 모달)
   - 글 작성/수정: 마크다운 에디터 (textarea + 미리보기 토글)
4. app/admin/settings/page.tsx:
   - API Key 관리: 발급(이름 입력 → 키 생성+표시), 목록, 비활성화
   - GitHub 감시 레포 관리: 추가(owner/name/branch), 목록, 삭제, 자동발행 토글

관리자 UI는 심플하게. Tailwind만으로 깔끔한 테이블/폼 스타일.
```

### Step 1-11: SEO + 다크모드 + RSS

```
SEO, 다크모드 마무리, RSS를 설정해줘.

1. SEO:
   - app/layout.tsx에 기본 메타데이터 (title, description, openGraph)
   - 글 상세 페이지: generateMetadata에서 동적 OG 태그
   - app/sitemap.ts — 동적 사이트맵 생성
   - app/robots.ts — robots.txt
   - JSON-LD 구조화 데이터 (Article, Person)
2. 다크모드:
   - next-themes ThemeProvider (attribute="class")
   - suppressHydrationWarning
   - 시스템 설정 자동 감지 + 수동 토글
   - 모든 컴포넌트에 dark: 변형 확인
3. RSS:
   - app/rss.xml/route.ts — 최신 글 20개 RSS 2.0 피드 생성
4. 검색:
   - app/search/page.tsx
   - Fuse.js로 클라이언트 사이드 전문 검색
   - 글 목록 JSON을 빌드 시 생성하거나 API에서 가져오기
```

---

## Phase 2: GitHub 자동화

### Step 2-1: GitHub Webhook 수신

```
먼저 Phase 2에 필요한 패키지를 설치해줘:
  npm install @octokit/rest @anthropic-ai/sdk

그다음 GitHub Webhook 수신 엔드포인트를 만들어줘.

app/api/webhooks/github/route.ts:
1. Webhook 시그니처 검증 (GITHUB_WEBHOOK_SECRET으로 HMAC-SHA256)
2. push 이벤트만 처리 (다른 이벤트는 200 OK 후 무시)
3. payload에서 추출:
   - repository.full_name (owner/repo)
   - ref (브랜치)
   - commits[] (id, message, timestamp, added, removed, modified)
4. WatchedRepo 테이블에서 해당 레포가 감시 대상인지 확인
5. 감시 대상이면:
   - Octokit으로 각 커밋의 상세 데이터 조회 (diff, files, stats)
   - 파일별 patch 앞 500자만 추출 (토큰 절약)
   - generate-post 함수 호출
6. 응답: 202 Accepted (비동기 처리)

lib/github.ts:
- Octokit 인스턴스 (GITHUB_TOKEN)
- getCommitDetail(owner, repo, sha) 함수
- parseWebhookPayload(body) 함수
```

### Step 2-2: AI 글 생성 파이프라인

```
커밋 데이터를 받아서 블로그 글을 생성하는 파이프라인을 만들어줘.

lib/claude.ts:
- Anthropic SDK 클라이언트 초기화
- generateBlogPost(commitData, options) 함수

lib/generate-post.ts:
1. 입력: 커밋 데이터 배열 + 레포 정보
2. 커밋 데이터 전처리:
   - 파일별 patch 요약 (앞 500자)
   - 변경 통계 (additions, deletions, files changed)
   - 커밋 메시지 정리
3. Claude API 호출:
   - system prompt: BLOG_REQUIREMENTS.md 부록의 "AI 자동 글 생성 규칙"을 그대로 포함
     - 대화체(~다 체), 첫 문장 핵심, 불릿/넘버링 금지
     - Before/After 코드 대비, 구체적 숫자
     - 5000~8000자, 섹션 4개 이상
   - user prompt: 커밋 데이터 + "이 커밋들을 기반으로 기술 블로그 글을 작성해줘"
   - 응답에서 title, content, tags 파싱
4. 결과를 Post 모델로 DB에 저장:
   - category: COMMITS
   - projectSlug: 레포 이름
   - commitHash: 마지막 커밋 해시
   - commitRepo: owner/repo
   - commitFilesChanged: 총 변경 파일 수
   - published: WatchedRepo.autoPublish에 따라
   - readingTime 자동 계산
5. 에러 처리: 실패 시 로그 남기고 무시 (Webhook 응답에 영향 없게)

한영 동시 작성은 Phase 3에서 추가. 지금은 한국어만.
```

### Step 2-3: 관리자 — 레포 관리 강화

```
관리자 설정 페이지의 레포 관리를 강화해줘.

app/admin/settings/page.tsx 의 레포 관리 섹션:
1. 레포 추가 폼: owner, name, branch(기본 main), 자동발행 토글
2. 레포 목록:
   - 각 레포: owner/repo, branch, 자동발행 상태, 마지막 감지 시간
   - 수정/삭제 버튼
   - "Webhook URL" 복사 버튼 (GitHub에서 설정할 URL)
   - "테스트" 버튼 — 최근 커밋 1개를 가져와서 글 생성 미리보기
3. AI 프롬프트 커스텀:
   - 레포별 추가 프롬프트 (promptTemplate 필드)
   - 기본 AI 글 생성 규칙 (BLOG_REQUIREMENTS.md 부록) + 레포별 추가 지시
4. Webhook 설정 가이드:
   - GitHub 레포 Settings → Webhooks 설정 방법 안내 텍스트
   - Payload URL, Content type, Secret, Events 설정값 표시
```

---

## Phase 3: 고도화

### Step 3-1: 통계 페이지

```
먼저 Phase 3에 필요한 패키지를 설치해줘:
  npm install recharts

통계 페이지를 만들어줘.

두 가지 방식 병행:
A) 내부 간단 트래킹:
   - 글 조회 시 Analytics 모델에 기록 (postId, referrer, userAgent, timestamp)
   - middleware.ts에서 /post/ 경로 접근 시 자동 기록

B) Umami 연동:
   - Umami 스크립트 태그를 layout.tsx에 추가
   - 환경변수: NEXT_PUBLIC_UMAMI_WEBSITE_ID, NEXT_PUBLIC_UMAMI_URL

app/admin/analytics/page.tsx:
1. 내부 데이터 기반:
   - 글별 조회수 랭킹 (Top 10)
   - 카테고리별 조회수 비교
   - 최근 7일/30일 일별 조회수 차트 (간단한 bar chart, recharts 또는 순수 CSS)
2. Umami 임베드 (iframe 또는 API):
   - 방문자 수 (UV/PV)
   - 유입 경로
   - 인기 페이지

recharts를 사용해서 차트를 그려줘. 심플하게.
```

### Step 3-2: 시리즈 기능

```
시리즈 기능을 만들어줘.

1. app/series/page.tsx — 시리즈 목록
   - 카드 형태: 시리즈 제목 + 설명 + 글 수 + 최근 업데이트
2. app/series/[slug]/page.tsx — 시리즈 상세
   - 시리즈 헤더 (제목, 설명)
   - 소속 글 목록 (순서대로)
3. 글 상세 페이지에 시리즈 네비게이션 추가:
   - 글이 시리즈에 속하면 상단에 "시리즈명 (3/7)" 표시
   - 이전/다음 글 네비게이션이 시리즈 내 순서로 동작
4. 관리자 페이지에서 시리즈 CRUD + 글 할당
```

### Step 3-3: 한영 전환 (i18n)

```
한영 전환 기능을 만들어줘.

1. Post 모델에 이미 locale 필드가 있음 (ko/en)
2. 같은 slug에 locale만 다른 글 쌍으로 연결
   - 글 상세 페이지에서 "🌐 English" / "🌐 한국어" 전환 링크
3. 메인 피드에서는 현재 선택된 언어의 글만 표시
4. 언어 선택: 쿠키 또는 URL 파라미터 (?lang=en)
5. AI 글 생성 시 한영 동시 생성 옵션:
   - generate-post.ts에 영어 버전 생성 로직 추가
   - BLOG_REQUIREMENTS.md 부록의 글 생성 규칙 기반 + 영어 독자 관점으로 재작성
6. UI 텍스트 i18n은 최소화 (nav, footer 정도만)
```

### Step 3-4: 검색 강화 + 태그

```
검색과 태그 시스템을 강화해줘.

1. app/tag/[tag]/page.tsx:
   - 해당 태그가 달린 모든 글 리스트
   - 관련 태그 표시
2. 검색 강화:
   - app/search/page.tsx 개선
   - 검색 결과 하이라이트
   - 최근 검색어 (localStorage)
3. 인기 태그:
   - 메인 페이지 또는 사이드바에 인기 태그 클라우드
   - 태그별 글 수 카운트
```

### Step 3-5: 배포 설정 (Railway)

```
Railway 배포 설정을 만들어줘.

1. Dockerfile:
   - Node.js 20 alpine 베이스
   - pnpm 사용
   - multi-stage build (builder → runner)
   - prisma generate + next build
   - 포트 3000 노출
2. railway.toml 또는 nixpacks 설정
3. 환경변수 목록 정리 (.env.example 업데이트)
4. prisma migrate deploy 자동 실행 (시작 스크립트에 포함)
5. next.config.ts:
   - output: "standalone" (Docker 최적화)
   - images: remotePatterns 설정
6. health check 엔드포인트: /api/health
```

### Step 3-6: 최종 점검

```
전체 프로젝트를 점검해줘.

1. TypeScript 에러 확인: npx tsc --noEmit
2. 린트: npx next lint
3. 빌드 테스트: npx next build
4. 모든 페이지 접근 테스트:
   - /, /commits, /articles, /techlab, /casual
   - /post/[slug], /about, /search, /series
   - /admin, /admin/posts, /admin/analytics, /admin/settings
   - /api/v1/posts (GET, POST)
   - /api/webhooks/github
5. 다크모드 전체 페이지 확인
6. 모바일 반응형 확인 (640px, 768px, 1024px)
7. SEO 체크: sitemap.xml, robots.txt, OG 태그
8. 누락된 기능이 있으면 수정
9. README.md 작성 (설치, 환경변수, 배포 방법)
```

---

## 트러블슈팅 프롬프트

문제가 생기면 아래처럼 물어봐:

```
[에러 메시지 또는 상황 설명]

이 에러를 수정해줘. 수정 전에 원인을 먼저 설명하고, 최소한의 변경으로 수정해.
```

```
현재 상태:
- Step 1-5까지 완료
- 메인 페이지에서 카테고리 필터 클릭 시 URL은 바뀌는데 글 목록이 안 바뀜

이 문제를 디버깅하고 수정해줘.
```

---

## 팁

1. **한 번에 하나씩.** Step 하나가 끝나면 `npm run dev`로 확인 후 다음 Step.
2. **커밋 자주.** 각 Step 완료 시 커밋. 문제 생기면 되돌릴 수 있게.
3. **에러나면 바로 물어봐.** 에러 메시지 전체를 복붙하면 Claude Code가 잘 잡아줌.
4. **디자인 확인은 목업과 비교.** `radar-blog-mockup-v2.html`을 브라우저에서 열어두고 비교.
5. **DB 마이그레이션.** Prisma 스키마 수정 후 `npx prisma migrate dev --name 설명` 잊지 마.
6. **seed 데이터.** Step 1-5 이후 테스트용 더미 글 데이터를 넣어두면 편함:
   ```
   prisma/seed.ts에 테스트용 더미 포스트 6개를 만들어줘.
   각 카테고리별 1~2개씩, 목업에 있는 글 제목과 내용을 사용해.
   ```
