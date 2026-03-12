이 폴더에 CLAUDE.md, BLOG_REQUIREMENTS.md, DESIGN_SYSTEM.md, PROMPTS.md, radar-blog-mockup-v2.html이 있어.

먼저 CLAUDE.md를 읽고 프로젝트 전체 맥락을 파악해줘.

그 다음 프로젝트를 초기화해줘:

1. Next.js 15 App Router + TypeScript로 프로젝트 생성 (이 폴더를 루트로 사용, 기존 문서 파일은 /docs로 이동)
2. 필요한 패키지 설치:
   - tailwindcss, @tailwindcss/typography
   - prisma, @prisma/client
   - next-auth (Auth.js v5)
   - next-mdx-remote, rehype-pretty-code, shiki, remark-gfm
   - next-themes (다크모드)
   - lucide-react (아이콘)
   - fuse.js (검색)
3. Tailwind 설정 — DESIGN_SYSTEM.md의 컬러, 폰트 변수를 tailwind.config.ts에 반영
4. globals.css에 CSS 변수 정의 (라이트/다크 모드 전부, DESIGN_SYSTEM.md 참고)
5. Pretendard Variable + JetBrains Mono 폰트 설정
6. .env.example 생성 (CLAUDE.md 환경변수 섹션 참고)
7. tsconfig.json strict mode

CLAUDE.md의 기술 스택과 디렉토리 구조를 정확히 따라줘.
