# CLAUDE.md — 레이더 테크블로그

## 프로젝트 개요

"레이더" 테크블로그. GitHub 커밋을 감지하여 AI가 자동으로 블로그 글을 생성·발행하는 개인 개발 블로그.
레퍼런스 디자인: tech.kakao.com (카카오테크)

## 기술 스택

- **프레임워크:** Next.js 15 (App Router)
- **언어:** TypeScript (strict mode)
- **스타일:** Tailwind CSS v3 + @tailwindcss/typography
- **DB:** PostgreSQL (Railway)
- **ORM:** Prisma
- **인증:** NextAuth.js (Auth.js v5) + GitHub OAuth
- **마크다운:** next-mdx-remote + rehype-pretty-code (Shiki) + remark-gfm
- **AI:** Claude API (@anthropic-ai/sdk) — Sonnet 모델
- **GitHub:** Octokit (@octokit/rest) + Webhooks
- **통계:** Umami (별도 Railway 인스턴스)
- **댓글:** Giscus (GitHub Discussions)
- **검색:** Fuse.js (클라이언트 사이드)
- **배포:** Railway
- **폰트:** Pretendard Variable + JetBrains Mono

## 디렉토리 구조

```
radar-blog/
├── prisma/c
│   └── schema.prisma
├── public/
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # 전역 레이아웃 (NavBar, Footer, ThemeProvider)
│   │   ├── page.tsx                   # 메인 (히어로 + 포스트 리스트)
│   │   ├── globals.css                # CSS 변수, Tailwind 설정
│   │   ├── commits/
│   │   │   ├── page.tsx               # 커밋 카테고리 피드
│   │   │   └── [project]/page.tsx     # 프로젝트별 커밋 기록
│   │   ├── articles/page.tsx
│   │   ├── techlab/page.tsx
│   │   ├── casual/page.tsx
│   │   ├── post/[slug]/page.tsx       # 글 상세
│   │   ├── about/page.tsx             # 소개
│   │   ├── search/page.tsx            # 검색 결과
│   │   ├── series/
│   │   │   ├── page.tsx               # 시리즈 목록
│   │   │   └── [slug]/page.tsx
│   │   ├── tag/[tag]/page.tsx         # 태그별 필터
│   │   ├── sitemap.ts                # 동적 사이트맵
│   │   ├── robots.ts                 # robots.txt
│   │   ├── rss.xml/route.ts          # RSS 피드
│   │   ├── admin/
│   │   │   ├── layout.tsx             # 관리자 레이아웃 (인증 체크)
│   │   │   ├── page.tsx               # 대시보드
│   │   │   ├── posts/page.tsx         # 글 관리
│   │   │   ├── analytics/page.tsx     # 통계 (Umami 연동)
│   │   │   └── settings/page.tsx      # 설정 (API Key, 레포 관리)
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── v1/
│   │       │   ├── posts/route.ts     # 외부 발행 API
│   │       │   └── posts/[id]/route.ts
│   │       └── webhooks/
│   │           └── github/route.ts    # Webhook 수신
│   ├── components/
│   │   ├── layout/
│   │   │   ├── NavBar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── post/
│   │   │   ├── PostList.tsx           # 수평 카드 리스트
│   │   │   ├── PostItem.tsx           # 개별 수평 카드
│   │   │   ├── PostDetail.tsx         # 글 상세 본문
│   │   │   ├── TableOfContents.tsx    # TOC (sticky sidebar)
│   │   │   └── PostNav.tsx            # 이전/다음 글
│   │   ├── home/
│   │   │   ├── HeroBanner.tsx         # 다크 히어로 배너
│   │   │   └── CategoryFilter.tsx     # pill 칩 필터
│   │   ├── about/
│   │   │   ├── ProfileSection.tsx
│   │   │   └── ProjectCard.tsx
│   │   ├── admin/
│   │   │   ├── PostEditor.tsx
│   │   │   ├── ApiKeyManager.tsx
│   │   │   └── RepoManager.tsx
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── SearchBar.tsx
│   │       └── Skeleton.tsx
│   ├── lib/
│   │   ├── prisma.ts                  # Prisma client singleton
│   │   ├── auth.ts                    # NextAuth 설정
│   │   ├── claude.ts                  # Claude API 유틸
│   │   ├── github.ts                  # Octokit + Webhook 처리
│   │   ├── markdown.ts                # MDX 렌더링 유틸
│   │   ├── generate-post.ts           # 커밋 → 블로그 글 생성 로직
│   │   └── api-auth.ts               # API Key 인증 미들웨어
│   ├── types/
│   │   └── index.ts
│   └── config/
│       └── site.ts                    # 블로그 메타 설정
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── Dockerfile                         # Railway 배포용
└── CLAUDE.md
```

## 디자인 규칙

### 레퍼런스: tech.kakao.com (카카오테크)

**레이아웃:**
- 미니멀 네비게이션: "레이더.dev" 로고 + Blog/Projects/About + 검색/다크모드
- 다크 히어로 배너 (메인 상단)
- 수평 카드 리스트 (왼쪽 썸네일 200×130 + 오른쪽 텍스트)
- 카드 구분: box-shadow가 아닌 border-bottom 구분선
- 글 상세: max-width 720px + 우측 sticky TOC
- 전체 max-width: 1100px

**컬러:**
- 라이트: #FFFFFF 바탕, #1B1D1F 텍스트, #3182F6 액센트
- 다크: #1B1D1F 바탕, #ECECEC 텍스트, #60A5FA 액센트
- 카테고리: commits=#00C471, articles=#3182F6, techlab=#8B5CF6, casual=#FF6B35
- 코드 블록: #191A1C 배경

**타이포:**
- Pretendard Variable (본문/제목)
- JetBrains Mono (코드)
- 본문: 17px / line-height 1.85
- 제목(H1): 36px / font-weight 800
- 코드: 14px / line-height 1.7

**컴포넌트:**
- 카테고리 필터: pill 칩 (border-radius: 9999px)
- 포스트 카드: 수평 레이아웃, hover 시 배경색 변경 (shadow 아님)
- 배지: 카테고리별 배경색 12% 투명도 + 해당 색 텍스트

## 코딩 규칙

### 일반
- TypeScript strict mode, any 금지
- 컴포넌트는 함수형 + arrow function export
- Server Component 기본, 클라이언트 필요시만 "use client"
- import 순서: react → next → 외부 → 내부 → types → styles
- 파일명: PascalCase (컴포넌트), camelCase (유틸), kebab-case (라우트)

### Prisma
- prisma.ts에서 globalThis로 singleton 관리
- 모든 DB 접근은 server action 또는 API route에서만
- 에러 처리: try-catch + 구체적 에러 메시지

### API
- 외부 API: /api/v1/ 프리픽스, Bearer token 인증
- 내부 API: /api/ 프리픽스, NextAuth 세션 인증
- 응답 형식: { success: boolean, data?: T, error?: string }

### 스타일
- Tailwind 유틸리티 클래스 우선
- CSS 변수: globals.css에 정의, Tailwind config에서 참조
- 다크모드: class 전략 (next-themes)
- 반응형: mobile-first (sm → md → lg)

## 환경 변수

```env
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Claude API
ANTHROPIC_API_KEY=

# GitHub (for Octokit)
GITHUB_TOKEN=
GITHUB_WEBHOOK_SECRET=

# Admin
ADMIN_GITHUB_ID=your-github-username

# Umami (통계)
NEXT_PUBLIC_UMAMI_URL=https://your-umami.railway.app
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
```

## 커밋 규칙

```
feat: 새 기능
fix: 버그 수정
style: 스타일/UI 변경
refactor: 리팩토링
docs: 문서
chore: 설정/빌드
```

## 참고 문서

- 요구사항: BLOG_REQUIREMENTS.md
- 디자인 시스템: DESIGN_SYSTEM.md
- 목업: radar-blog-mockup-v2.html
- AI 글 생성 규칙: BLOG_REQUIREMENTS.md 부록 (시스템 프롬프트에 포함할 문체/구조 규칙)
