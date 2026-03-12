# 레이더의 개인 테크블로그 — 요구사항 정의서

> 레퍼런스: [카카오테크](https://tech.kakao.com/)
> 작성일: 2026-03-09

---

## 1. 프로젝트 개요

### 1.1 블로그 정체성

- **블로그명:** 레이더
- **로고:** 레이더.dev (점(.)에 액센트 색 적용)
- **운영자:** 레이더 (KimYoungtae) — UE5 C++ 게임 프로그래머 / AI × 사이드프로젝트 빌더
- **핵심 컨셉:** GitHub에 올라오는 작업을 실시간으로 감지하여 자동으로 글을 생성·발행하는 AI 기반 개발 블로그
- **레퍼런스 디자인:** 카카오테크 — 다크 히어로 배너, 수평 카드 리스트, 미니멀 네비게이션, 타이포 중심

### 1.2 핵심 차별점

- **자동 발행 파이프라인:** GitHub 커밋/푸시 감지 → AI가 글 초안 생성 → 블로그 발행
- **외부 API 제공:** git2blog 등 외부 도구에서 API Key로 글을 발행할 수 있는 엔드포인트
- **프로젝트 단위 정리:** 커밋 로그가 프로젝트별로 분류·정리되어 타임라인처럼 쌓임

---

## 2. 콘텐츠 구조 (카테고리)

### 2.1 커밋 로그 (Commits)

**목적:** GitHub 커밋이 감지될 때마다 자동으로 생성되는 개발 기록

**핵심 요구사항:**

- GitHub Webhook 또는 Polling으로 특정 레포지토리의 push 이벤트 감지
- 감지 시 커밋 메시지, diff, 변경 파일 목록을 수집
- AI(Claude API 등)가 본 문서 부록의 "AI 자동 글 생성 규칙"에 맞춰 글 초안 생성
- **프로젝트별 그룹핑이 핵심** — 같은 레포의 커밋은 하나의 프로젝트 타임라인으로 묶임
- 프로젝트별 전용 페이지: 해당 프로젝트의 커밋 기반 글 목록, README 요약, 최근 활동 표시
- 각 글에 커밋 해시, 레포 링크, 변경 파일 수 등 메타정보 자동 삽입

**UI 참고 (카카오테크 스타일):**

- 카드에 프로젝트 아이콘/이름 + 글 제목 + 요약 + 날짜 + 읽기 시간
- 프로젝트별 필터 탭 또는 태그

**자동 발행 파이프라인:**

```
GitHub Push → Webhook → 서버 수신 → 커밋 데이터 수집
→ AI 글 생성 (부록 규칙 적용) → 초안 저장
→ (옵션) 작성자 검토 후 발행 / 자동 발행
```

**관리 대상 레포 설정:**

- 관리자 페이지에서 감시할 레포지토리 목록 CRUD
- 레포별 설정: 자동 발행 여부, AI 프롬프트 커스텀, 카테고리 매핑

### 2.2 정리된 글 (Articles)

**목적:** 프로젝트가 어느 정도 완성된 후 작성하는 정돈된 기술 포스트

**핵심 요구사항:**

- [git2blog](https://github.com/on1659/git2blog)를 통한 외부 발행 지원
- **API Key 기반 발행 엔드포인트 제공** — 외부 도구/스크립트에서 글을 올릴 수 있어야 함
- API 스펙:
  - `POST /api/v1/posts` — 새 글 발행
  - `PUT /api/v1/posts/:id` — 글 수정
  - `DELETE /api/v1/posts/:id` — 글 삭제
  - 인증: API Key (Bearer Token)
  - Body: `{ title, content, category, tags, coverImage?, slug?, published? }`
- API Key는 관리자 페이지에서 발급/폐기 가능
- API로 올리는 글은 "정리된 글" 카테고리 기본값이지만, `category` 파라미터로 어떤 카테고리에든 발행 가능
- 카카오테크 스타일의 풍부한 포스트 뷰: 커버 이미지, 작성자 프로필, 태그, 목차(TOC), 읽기 시간

### 2.3 기술 연구 (Tech Lab)

**목적:** AI 실험, 연구, 프로토타입 등 서비스화되지 않은 기술적 탐구 기록

**핵심 요구사항:**

- 별도 테마/카테고리로 시각적 구분 (카드 색상, 아이콘, 라벨 등)
- 실험 상태 표시: `진행중` / `완료` / `보류`
- 관련 기술 스택 태그 (예: `LoRA`, `RAG`, `local-llm`, `quantization`)
- 코드 블록, Mermaid 다이어그램, 수식(KaTeX) 렌더링 지원
- API 또는 에디터로 작성 가능

### 2.4 잡담 (Casual)

**목적:** 개발 외 일상, 생각, 감상 등 가벼운 글

**핵심 요구사항:**

- 다른 카테고리 대비 가벼운 카드 스타일 (예: 배경색 차이, 아이콘)
- 짧은 글도 허용 (최소 분량 제한 없음)
- 커버 이미지 선택적

---

## 3. 통계 페이지 (Analytics)

### 3.1 방문자 통계

- 일별/주별/월별 방문자 수 (UV, PV)
- 실시간 접속자 수

### 3.2 유입 경로 분석

- Referrer 기반 유입 경로: 직접 접속, 검색엔진(Google, Naver 등), SNS, 외부 링크
- UTM 파라미터 지원 (`utm_source`, `utm_medium`, `utm_campaign`)
- 유입 경로별 비율 차트

### 3.3 콘텐츠 성과

- 글별 조회수 랭킹
- 카테고리별 조회수 비교
- 인기 태그 워드클라우드
- 평균 체류 시간 (가능한 경우)

### 3.4 검색 통계

- 내부 검색어 로그 (블로그 내 검색)
- 외부 검색 키워드 (Google Search Console 연동 권장)

### 3.5 구현 방식

- **자체 수집:** 경량 트래킹 스크립트 (쿠키리스 가능) + DB 저장
- **외부 연동 옵션:** Google Analytics 4, Plausible, Umami 등 선택적 연동
- **대시보드:** 관리자 전용 `/admin/analytics` 페이지

---

## 4. 소개 페이지 (About)

### 4.1 작성자 프로필

- 프로필 사진
- 이름, 한줄 소개
- 본업 소개: UE5 C++ 게임 프로그래머 (멀티플레이어, Slate UI, 크로스플랫폼)
- 사이드 소개: AI × 사이드프로젝트 빌더
- 기술 스택 시각화 (태그 클라우드 또는 아이콘 그리드)

### 4.2 프로젝트 쇼케이스

- 주요 프로젝트 카드 (이름, 설명, 기술 스택, GitHub 링크, 상태)
- 예시: LAMDiceBot, git2blog, wedding-invitation, GameForge 등

### 4.3 연락처 / 링크

- GitHub, 이메일, LinkedIn 등 소셜 링크
- 블로그 RSS 피드 링크

---

## 5. 추가 권장 기능

### 5.1 검색 (Search)

- 전문 검색(Full-text Search) — 제목, 본문, 태그 대상
- 카카오테크 스타일의 태그 기반 필터와 병행
- 검색 결과 하이라이트

### 5.2 시리즈 (Series)

- 여러 글을 하나의 시리즈로 묶는 기능
- 시리즈 목록 페이지 + 글 내 이전/다음 네비게이션
- 예: "AI × 사이드프로젝트 개발기", "UE5 멀티플레이어 일지"

### 5.3 RSS / 뉴스레터

- RSS 피드 자동 생성 (`/rss.xml`)
- 이메일 구독 (선택적 — Buttondown, Resend 등 연동)

### 5.4 다크모드

- 시스템 설정 따라가기 + 수동 토글
- 카카오테크도 다크/라이트 지원

### 5.5 SEO 최적화

- Open Graph / Twitter Card 메타태그 자동 생성
- `sitemap.xml`, `robots.txt` 자동 생성
- 구조화된 데이터 (JSON-LD — Article, Person, BreadcrumbList)
- Google Search Console 연동 가이드

### 5.6 댓글 시스템

- Giscus (GitHub Discussions 기반) 또는 utterances
- 외부 서비스 의존으로 DB 부담 없음

### 5.7 관리자 페이지 (Admin)

- 글 관리: CRUD, 발행/임시저장 상태 전환
- API Key 관리: 발급, 목록, 폐기
- GitHub 감시 레포 관리
- 통계 대시보드 (섹션 3 통합)
- 카테고리/태그 관리
- 사이트 설정 (블로그명, 소개, 소셜 링크 등)

### 5.8 한영 전환 (i18n)

- 부록의 AI 글 생성 규칙에 영어 버전 작성 규칙 추가 예정
- 글별 한국어/영어 버전 연결
- UI 언어 전환 (ko/en)

---

## 6. 기술 스택 (확정)

> **조합 B: Railway 올인** — 기존 LAMDiceBot 인프라 활용, 상시 서버로 Webhook/Cron 자유, 월 $5~10

| 영역 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | **Next.js (App Router)** | SSG/ISR + API Routes + 관리자 페이지 올인원. AI 코드 생성 자료 가장 많음 |
| 스타일링 | **Tailwind CSS** | 카드 레이아웃, `dark:` 다크모드, 반응형 내장. AI 코드 생성 호환 최고 |
| DB | **PostgreSQL (Railway)** | LAMDiceBot과 같은 Railway 인스턴스. 글, 메타데이터, 통계, API Key 전부 여기 |
| ORM | **Prisma** | 자료 가장 많고 안정적. AI 코드 생성 시 에러 적음. 마이그레이션 강력 |
| AI 글 생성 | **Claude API (Sonnet)** | 부록의 글 생성 규칙 기반 프롬프트로 커밋 → 블로그 글 자동 변환 |
| GitHub 연동 | **GitHub Webhooks + Octokit** | push 이벤트 수신, 커밋 메시지/diff/변경파일 조회 |
| 마크다운 렌더링 | **next-mdx-remote** | DB 저장 마크다운을 런타임 렌더링. 코드 하이라이트, Mermaid, KaTeX 지원 |
| 배포 | **Railway** | 상시 서버로 Webhook/Cron 자유. LAMDiceBot과 관리 포인트 통합 |
| 통계 | **Umami (Railway 셀프호스팅)** | 쿠키리스 오픈소스 웹 분석. 같은 Railway에 원클릭 배포. API로 대시보드 통합 |
| 검색 | **Fuse.js (클라이언트)** | 글 수가 적을 때 충분. 규모 커지면 Meilisearch 전환 가능 |
| 댓글 | **Giscus** | GitHub Discussions 기반. DB 부담 없음 |
| 인증 (Admin) | **NextAuth.js (Auth.js) + GitHub OAuth** | 관리자 GitHub 계정으로 로그인. 단일 계정 체제 |
| 코드 하이라이트 | **rehype-pretty-code + Shiki** | VS Code 수준 구문 강조. 다크/라이트 테마 지원 |

### 인프라 구조

```
Railway (단일 플랫폼)
├── radar-blog (Next.js 앱)      — 블로그 + API + 관리자
├── radar-db (PostgreSQL)         — LAMDiceBot DB와 같은 인스턴스 또는 별도
├── radar-umami (Umami)           — 통계 수집/대시보드
└── lamdicebot (기존)             — 기존 서비스 유지
```

### 예상 비용

| 서비스 | 비용 |
|--------|------|
| Railway (Next.js 앱) | ~$3/월 (저트래픽) |
| Railway (PostgreSQL) | 기존 인스턴스 공유 시 추가 비용 최소 |
| Railway (Umami) | ~$2/월 |
| 도메인 (선택) | ~$10/년 |
| Claude API | 사용량 기반 (커밋 빈도에 따라 $1~5/월) |
| **합계** | **~$5~10/월** |

---

## 7. 핵심 API 엔드포인트

### 7.1 외부 발행 API

```
POST   /api/v1/posts          — 글 발행
PUT    /api/v1/posts/:id      — 글 수정
DELETE /api/v1/posts/:id      — 글 삭제
GET    /api/v1/posts          — 글 목록 조회 (필터: category, tag, project)
GET    /api/v1/posts/:id      — 글 상세 조회

Headers:
  Authorization: Bearer <API_KEY>

Body (POST/PUT):
{
  "title": "string",
  "content": "string (markdown)",
  "category": "commits | articles | techlab | casual",
  "tags": ["string"],
  "coverImage": "string (URL, optional)",
  "slug": "string (optional, auto-generated)",
  "published": true,
  "locale": "ko | en",
  "projectSlug": "string (optional, commits 카테고리용)"
}
```

### 7.2 GitHub Webhook 수신

```
POST   /api/webhooks/github   — GitHub push 이벤트 수신
```

### 7.3 통계 API (관리자 전용)

```
GET    /api/v1/analytics/overview     — 전체 요약
GET    /api/v1/analytics/referrers    — 유입 경로
GET    /api/v1/analytics/posts        — 글별 성과
GET    /api/v1/analytics/search       — 검색어 로그
```

---

## 8. 페이지 구조

```
/                           — 메인 (전체 글 카드 피드, 카테고리 필터 탭)
/commits                    — 커밋 로그 카테고리
/commits/[project-slug]     — 프로젝트별 커밋 기록
/articles                   — 정리된 글 카테고리
/techlab                    — 기술 연구 카테고리
/casual                     — 잡담 카테고리
/post/[slug]                — 글 상세
/series                     — 시리즈 목록
/series/[slug]              — 시리즈 상세
/tag/[tag]                  — 태그별 글 목록
/about                      — 소개 페이지
/search                     — 검색 결과
/admin                      — 관리자 대시보드
/admin/posts                — 글 관리
/admin/analytics            — 통계
/admin/settings             — 설정 (API Key, 레포 관리 등)
/rss.xml                    — RSS 피드
/sitemap.xml                — 사이트맵
```

---

## 9. 디자인 가이드 (카카오테크 레퍼런스)

### 9.1 메인 페이지

- 상단: 미니멀 네비게이션 (로고 + Blog/Projects/About + 검색 + 다크모드)
- 히어로 배너: 다크 배경 + 브랜드 메시지 ("코드를 쓰면, 글이 된다.")
- 섹션 헤더: "최근 게시물" + "전체보기 →"
- 카테고리 필터: pill 칩 버튼 (전체, Commits, Articles, Tech Lab, Casual)
- **수평 카드 리스트**: 왼쪽 썸네일(200×130) + 오른쪽 텍스트 (카카오테크 스타일)
- 카드 구성: 카테고리 배지 + 제목 + 요약 + 작성자 · 날짜 · 읽기시간 + 태그
- 무한 스크롤 또는 페이지네이션

### 9.2 글 상세 페이지

- 상단: 카테고리 배지 + 제목(H1) + 부제 + 작성자 아바타/이름/날짜
- 사이드: 목차 (TOC, sticky, 스크롤 추적)
- 본문: max-width 720px, 마크다운 렌더링 (코드 하이라이트, Mermaid, KaTeX)
- 하단: 태그, 이전/다음 글, Giscus 댓글
- 커밋 기반 글: 커밋 메타정보 (해시, 레포, 변경 파일 수)

### 9.3 컬러/타이포

- 카카오테크 참고: 화이트 베이스 + 다크 히어로, 타이포 중심
- 블루(#3182F6) 액센트, 카테고리별 컬러 시스템
- 코드 블록: 다크 배경(#191A1C) 모노스페이스
- 다크모드: 딥 다크(#1B1D1F) 베이스

---

## 10. 우선순위 로드맵 (제안)

### Phase 1 — MVP

- 메인 페이지 (카드 피드 + 카테고리 필터)
- 글 상세 페이지 (마크다운 렌더링)
- 소개 페이지
- 외부 발행 API (API Key 인증)
- 관리자 기본 기능 (글 CRUD, API Key 관리)
- 다크모드
- SEO 기본 (OG 태그, sitemap)

### Phase 2 — 자동화

- GitHub Webhook 연동 + 커밋 감지
- AI 글 생성 파이프라인 (부록 규칙 기반)
- 프로젝트별 그룹핑 페이지
- 커밋 메타정보 자동 삽입

### Phase 3 — 고도화

- 통계 페이지 (방문자, 유입 경로, 글 성과)
- 검색 기능
- 시리즈 기능
- 한영 전환
- 댓글 (Giscus)
- RSS / 뉴스레터

---

## 부록: AI 자동 글 생성 규칙

GitHub 커밋 감지 → Claude API로 글을 생성할 때 적용되는 규칙.
이 규칙은 블로그 자체의 AI 글 생성 파이프라인(`lib/generate-post.ts`)에 시스템 프롬프트로 포함된다.

### 문체

- **대화체.** "~합니다"가 아니라 "~다" 체. 친구한테 설명하듯이.
- **첫 문장에 핵심.** 도입부 없이 바로 들어간다.
- **솔직하게.** 삽질, 실수, 모르는 것을 숨기지 않는다.
- **게임 개발자 시각.** UE5, 서버 아키텍처, 성능 최적화 감각이 자연스럽게 드러난다.

### 금지

- "~하겠습니다", "~인 것 같습니다" 같은 존댓말
- 불릿 포인트, 넘버링 리스트 (코드 블록 안의 나열도 최소화)
- "이 글에서는 ~에 대해 알아보겠습니다" 같은 교과서 도입부
- "정리하자면", "요약하면" 같은 상투적 결론
- 이모지 남용

### 필수 포함

- Before/After 코드 대비 (변경이 있을 때)
- 구체적 숫자 ($0.008, 120ms → 3ms, 15배 차이 등)
- "왜 이렇게 했는지" + "다른 방법은 왜 안 됐는지"
- 삽질 포인트 ("여기서 3시간 날렸다")
- 마지막은 인용구(>) 형태의 한줄 정리로 마무리

### 구조

- 고정 구조 없이 내용에 맞게 유연하게
- `##` 섹션 최소 4개, 각 섹션은 3~5개 문단 + 코드 블록 1개 이상
- 편당 5000~8000자 (한국어 기준)
- 문단은 3~4줄 이내, 문단 사이 빈 줄
- 코드 블록 앞뒤 빈 줄

### 커밋 기반 글 특화

- 커밋 메시지에서 "뭘 했는지" 추출, diff에서 "어떻게 했는지" 추출
- 사소한 수정(typo fix, formatting)은 짧게 요약하거나 생략
- 의미 있는 변경만 깊게 서술
- 프로젝트 컨텍스트를 반영 (이전 커밋에서 어떤 상태였는지)

