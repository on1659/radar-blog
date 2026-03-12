# 이더 블로그 — 디자인 시스템

> 레퍼런스: [카카오테크 (tech.kakao.com)](https://tech.kakao.com/)  
> 방향: 카카오테크의 미니멀한 구조 + 다크 히어로 + 수평 카드 레이아웃을 개인 개발자 톤으로

---

## 1. 디자인 철학

### 핵심 원칙

**"읽히는 코드, 읽히는 글"**

- 콘텐츠가 주인공. 장식은 최소화.
- 카카오테크처럼 넓은 여백, 수평 카드, 미니멀 네비게이션
- 다크 히어로 배너로 시각적 임팩트
- 코드 블록이 많은 기술 블로그 → 코드의 가독성이 곧 디자인
- 개인 블로그 특유의 따뜻함. 기업 블로그보다 조금 더 캐주얼

### 카카오테크에서 가져올 것

- **수평 카드 레이아웃** (왼쪽 썸네일 + 오른쪽 텍스트) — 리스트형 피드
- **미니멀 네비게이션** — 로고 + 최소 링크 + 검색 + 다크모드
- **다크 히어로 배너** — 상단에 브랜드 메시지
- **카테고리 pill 필터** — 작고 깔끔한 칩 버튼
- **작성자 + 날짜 메타** 배치
- **사이트맵 스타일 푸터** — 여러 컬럼

### 카카오테크와 다르게 할 것

- 1인 블로그이므로 팀/작성자 목록 불필요 → 프로젝트별 구분으로 대체
- 커밋 기반 글에 GitHub 메타정보 (해시, 파일 수) 배지 추가
- 카테고리별 색상 시스템 (commits=그린, articles=블루, techlab=퍼플, casual=오렌지)
- 개인 브랜딩: "이더.dev" 로고, 그라데이션 액센트

---

## 2. 컬러 시스템

### Light Mode

```css
:root {
  /* 배경 */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F7F8FA;
  --bg-tertiary: #ECEEF1;
  
  /* 텍스트 */
  --text-primary: #1B1D1F;
  --text-secondary: #4E5968;
  --text-tertiary: #8B95A1;
  --text-muted: #B0B8C1;
  
  /* 브랜드 — "이더"의 시그니처 */
  --brand-primary: #3182F6;       /* 블루 — 코드, 기술, 신뢰 */
  --brand-primary-light: rgba(49, 130, 246, 0.12);
  --brand-primary-dark: #1D4ED8;
  
  /* 카테고리 컬러 */
  --cat-commits: #00C471;         /* 그린 — GitHub 커밋 */
  --cat-articles: #3182F6;        /* 블루 — 정리된 글 */
  --cat-techlab: #8B5CF6;         /* 퍼플 — 실험/연구 */
  --cat-casual: #FF6B35;          /* 오렌지 — 잡담 */
  
  /* 코드 블록 */
  --code-bg: #191A1C;
  --code-text: #D1D5DB;
  
  /* 보더/구분선 */
  --border: #E5E8EB;
  --border-light: #F2F4F6;
  
  /* 카드 */
  --card-bg: #FFFFFF;
  --card-hover: #F7F8FA;
}
```

### Dark Mode

```css
[data-theme="dark"] {
  --bg-primary: #1B1D1F;
  --bg-secondary: #212325;
  --bg-tertiary: #2B2D31;
  
  --text-primary: #ECECEC;
  --text-secondary: #B0B8C1;
  --text-tertiary: #6B7684;
  --text-muted: #4E5968;
  
  --brand-primary: #60A5FA;
  --brand-primary-light: #1E3A5F;
  --brand-primary-dark: #93C5FD;
  
  --code-bg: #0F1012;
  --code-text: #E6EDF3;
  
  --border: #333538;
  --border-light: #28292B;
  
  --card-bg: #212325;
  --card-hover: #2B2D31;
}
```

### 카테고리 컬러 사용 규칙

- 카드 좌측 상단에 카테고리 라벨 (배경: 카테고리 컬러, 텍스트: 화이트)
- 커밋 카드: 좌측에 얇은 그린 보더 + 커밋 아이콘
- 테크랩 카드: 실험 상태 배지에 퍼플 사용
- 라벨 크기: 작고 절제되게. 카드를 압도하지 않을 것

---

## 3. 타이포그래피

### 폰트 패밀리

```css
:root {
  /* 본문 — 한글 가독성 최우선 */
  --font-body: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  
  /* 제목 — 약간의 개성 */
  --font-heading: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* 코드 */
  --font-code: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}
```

**왜 Pretendard?**
- 한글 기술 블로그 사실상 표준. 카카오테크도 사용
- 숫자, 영문, 한글 모두 깔끔
- Variable font로 굵기 조절 자유로움
- 웹폰트 최적화 (subset) 쉬움

### 타이포 스케일

| 용도 | 사이즈 | 굵기 | 행간 |
|------|--------|------|------|
| 페이지 타이틀 (H1) | 2.25rem (36px) | 800 | 1.3 |
| 섹션 타이틀 (H2) | 1.5rem (24px) | 700 | 1.4 |
| 서브 헤딩 (H3) | 1.25rem (20px) | 600 | 1.4 |
| 본문 | 1.0625rem (17px) | 400 | 1.85 |
| 카드 제목 | 1.125rem (18px) | 600 | 1.4 |
| 카드 설명 | 0.9375rem (15px) | 400 | 1.6 |
| 메타 정보 | 0.8125rem (13px) | 400 | 1.4 |
| 코드 블록 | 0.875rem (14px) | 400 | 1.7 |
| 태그 | 0.75rem (12px) | 500 | 1.0 |

### 본문 가독성 규칙

- 본문 최대 너비: 720px (글 상세 페이지)
- 문단 간 간격: 1.5rem
- 코드 블록 앞뒤: 2rem 간격
- `##` 섹션 앞: 3rem 간격
- 인라인 코드: 배경 처리 + 패딩, 본문보다 약간 작게

---

## 4. 레이아웃 시스템

### 메인 페이지 구조 (카카오테크 스타일)

```
┌────────────────────────────────────────────────┐
│ NAV: [이더.dev]   Blog  Projects  About   🔍 🌙 │
├────────────────────────────────────────────────┤
│                                                │
│        다크 히어로 배너                           │
│    "코드를 쓰면, 글이 된다."                      │
│                                                │
├────────────────────────────────────────────────┤
│ 최근 게시물                          전체보기 →  │
├────────────────────────────────────────────────┤
│ [전체] [Commits] [Articles] [Tech Lab] [Casual] │
├────────────────────────────────────────────────┤
│                                                │
│ ┌──────────┐                                   │
│ │ Thumb    │  [commits] LAMDiceBot · a1b2c3d   │
│ │ 200×130  │  Socket.IO 팀 배정 리팩토링...      │
│ │          │  이더 · 2026.03.09 · 5 min        │
│ └──────────┘                                   │
│ ──────────────────────── (구분선) ──────────────│
│ ┌──────────┐                                   │
│ │ Thumb    │  [articles]                        │
│ │ 200×130  │  GitHub 커밋을 블로그 글로...        │
│ │          │  이더 · 2026.03.07 · 12 min       │
│ └──────────┘                                   │
│                                                │
└────────────────────────────────────────────────┘
```

### 글 상세 페이지 구조

```
┌────────────────────────────────────────────────┐
│ NAV                                             │
├────────────────────────────────────────────────┤
│                                                │
│   [articles]                                    │
│   글 제목 (H1, 2.25rem)                         │
│   부제목                                        │
│   [아바타] 이더 · 2026.03.07 · 12 min read      │
│   ─────────────────────────────                 │
│                                                │
├──────────────────────────┬─────────────────────┤
│                          │ TOC (sticky)         │
│  본문 (max-w: 720px)     │ · 왜 이걸 만들었나    │
│                          │ · 전체 아키텍처       │
│  h2, p, pre, blockquote  │ · 삽질 포인트        │
│                          │ · AI 프롬프트         │
│                          │                     │
├──────────────────────────┴─────────────────────┤
│ [태그들]                                        │
│ [← 이전 글]              [다음 글 →]            │
│ [댓글 영역]                                     │
└────────────────────────────────────────────────┘
```

### 반응형 브레이크포인트

| 이름 | 너비 | 그리드 열 | 비고 |
|------|------|----------|------|
| mobile | ~700px | 1열 | TOC 숨김, 카드 풀폭 |
| tablet | 701~1024px | 수평 카드 | TOC 숨김 |
| desktop | 1025px~ | 2열 카드 + 사이드 TOC | 전체 레이아웃 |

### 최대 너비

- 전체 컨테이너: 1100px
- 카드 리스트: 1100px
- 글 본문: 720px
- 네비게이션: 1100px

---

## 5. 컴포넌트 디자인

### 5.1 네비게이션 바 (카카오테크 스타일 — 미니멀)

```
┌──────────────────────────────────────────┐
│ [이더.dev]   Blog  Projects  About  🔍 🌙 │
└──────────────────────────────────────────┘
```

- 높이: 60px
- 배경: `--bg-primary` + 하단 보더 (`--border`)
- 로고: "이더.dev" (font-weight: 800, 점(.)에 accent 색)
- 링크: 최소한만 (Blog, Projects, About)
- 호버: 배경색 `--bg-secondary` + 색상 변경
- 활성: font-weight 600, `--text-primary` 색
- 우측: 검색 아이콘 + 다크모드 토글 (아이콘 버튼)
- 스크롤 시 고정 (sticky)
- 모바일: 링크 숨기고 햄버거 메뉴

### 5.2 카테고리 필터 (pill 칩 스타일)

```
[전체] [Commits] [Articles] [Tech Lab] [Casual]
```

- pill 형태 버튼, border-radius: 100px
- 기본: 1px 보더, `--text-tertiary` 텍스트
- 활성: `--text-primary` 배경, 반전 텍스트
- 호버: 보더 색 강조
- 태그 필터는 별도로 두지 않음 (카카오테크처럼 심플하게)

### 5.3 포스트 카드 (수평 레이아웃 — 카카오테크 스타일)

```
┌──────────┬──────────────────────────────────┐
│          │ [카테고리] 프로젝트명 · 해시       │
│  Thumb   │ 글 제목 (최대 2줄)                │
│ 200×130  │ 요약 텍스트 (최대 2줄)            │
│          │ 이더 · 2026.03.09 · 5min [태그들] │
└──────────┴──────────────────────────────────┘
```

- 수평 배치: 왼쪽 썸네일(200×130) + 오른쪽 텍스트
- 구분선: 카드 사이 1px `--border-light` 하단 보더 (그림자 아님)
- 호버: 배경색 `--card-hover` + 좌우 패딩 확장 (부드러운 하이라이트)
- 카테고리 배지: 작은 pill, 카테고리별 배경/텍스트 색
- 썸네일 없을 시: 카테고리 컬러 그라데이션 + 프로젝트명 텍스트
- 모바일(700px 이하): 세로 스택 (썸네일 위, 텍스트 아래)

### 5.4 커밋 카드 (특화)

```
┌─ 3px green border ─────────────┐
│ [Commits] [LAMDiceBot]          │
│                                 │
│ Socket.IO 팀 배정 로직 리팩토링    │
│                                 │
│ 기존 배열 순회 방식을 Map 기반으로  │
│ 변경하여 O(n) → O(1) 개선...      │
│                                 │
│ 🔗 a1b2c3d · 3 files changed    │
│ 2026.03.09 · 3 min read         │
│ [Socket.IO] [리팩토링]            │
└─────────────────────────────────┘
```

### 5.5 글 상세 페이지

**헤더 영역:**
- 커버 이미지: 전폭, max-height 320px, object-fit cover
- 없으면 카테고리 컬러 그라데이션 배경
- 카테고리 라벨 + 제목 (H1) + 부제 (있으면)
- 메타: 날짜 · 읽기 시간 · 태그

**본문 영역:**
- max-width 720px, 중앙 정렬
- 마크다운 렌더링:
  - `h2` 전 여백 3rem, 하단 보더 (선택)
  - `h3` 전 여백 2rem
  - 코드 블록: 다크 배경, 언어 라벨, 복사 버튼
  - 인라인 코드: `--bg-tertiary` 배경, 패딩 2px 6px, border-radius 4px
  - 인용구 (`>`): 좌측 3px `--brand-primary` 보더 + 이탤릭
  - 이미지: max-width 100%, border-radius 8px, 그림자
  - Mermaid: 자동 렌더링

**사이드 TOC (데스크톱만):**
- 우측 sticky, top: 112px
- 현재 읽고 있는 섹션 하이라이트 (`--brand-primary`)
- 클릭 시 smooth scroll

**하단:**
- 태그 목록
- 이전/다음 글 네비게이션 카드
- Giscus 댓글

### 5.6 소개 페이지 (About)

```
┌─────────────────────────────────┐
│        [프로필 이미지]            │
│                                 │
│         이더 (Radar)             │
│   UE5 게임 프로그래머             │
│   AI × 사이드프로젝트 빌더        │
│                                 │
│   [GitHub] [Email] [RSS]        │
├─────────────────────────────────┤
│                                 │
│   자기소개 텍스트                 │
│                                 │
├─────────────────────────────────┤
│   프로젝트 쇼케이스               │
│   ┌──────┐ ┌──────┐            │
│   │Proj 1│ │Proj 2│            │
│   └──────┘ └──────┘            │
│   ┌──────┐ ┌──────┐            │
│   │Proj 3│ │Proj 4│            │
│   └──────┘ └──────┘            │
├─────────────────────────────────┤
│   기술 스택                      │
└─────────────────────────────────┘
```

---

## 6. 모션 / 인터랙션

### 트랜지션 기본값

```css
:root {
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

### 적용 규칙

- **카드 호버:** 배경색 `--card-hover`로 변경 + 좌우 패딩 확장 (0.2s)
- **링크 호버:** color 변경 + underline offset 애니메이션
- **페이지 전환:** opacity fade (0.15s)
- **TOC 스크롤 추적:** 부드러운 색상 전환
- **다크모드 전환:** 전체 color/background 트랜지션 (0.3s)
- **카드 로딩:** skeleton shimmer 애니메이션
- **태그 필터:** 카드 레이아웃 변경 시 layout transition

### 금지

- 과도한 parallax
- 불필요한 3D 효과
- 자동 재생 애니메이션 (접근성)

---

## 7. 아이콘 시스템

**Lucide React** 사용 (일관성 + 가벼움)

| 용도 | 아이콘 |
|------|--------|
| 커밋 | `<GitCommit />` |
| 정리된 글 | `<FileText />` |
| 기술 연구 | `<Flask />` 또는 `<Beaker />` |
| 잡담 | `<MessageCircle />` |
| 검색 | `<Search />` |
| 다크모드 (라이트) | `<Sun />` |
| 다크모드 (다크) | `<Moon />` |
| GitHub | `<Github />` |
| 외부 링크 | `<ExternalLink />` |
| 읽기 시간 | `<Clock />` |
| 파일 변경 | `<FileDiff />` |
| 메뉴 | `<Menu />` |
| 닫기 | `<X />` |

---

## 8. 코드 블록 테마

**Shiki + One Dark Pro** (다크 기본)

```css
.code-block {
  background: var(--code-bg);
  border-radius: 8px;
  padding: 1.25rem;
  overflow-x: auto;
  font-family: var(--font-code);
  font-size: 0.875rem;
  line-height: 1.6;
  position: relative;
}

.code-block .lang-label {
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.code-block .copy-button {
  position: absolute;
  top: 8px;
  right: 60px;
  opacity: 0;
  transition: opacity 0.15s;
}

.code-block:hover .copy-button {
  opacity: 1;
}
```

---

## 9. 간격 시스템 (Spacing)

Tailwind 기반 8px 체계:

| 토큰 | 값 | 용도 |
|------|-----|------|
| `space-1` | 4px | 태그 내부 패딩 |
| `space-2` | 8px | 아이콘과 텍스트 간격 |
| `space-3` | 12px | 카드 내부 요소 간격 |
| `space-4` | 16px | 카드 패딩, 섹션 내 간격 |
| `space-5` | 20px | 카드 패딩 (큰) |
| `space-6` | 24px | 카드 그리드 gap |
| `space-8` | 32px | 섹션 간 간격 |
| `space-12` | 48px | 큰 섹션 간 간격 |
| `space-16` | 64px | 페이지 상단/하단 여백 |

---

## 10. 접근성

- 모든 인터랙티브 요소: focus-visible 스타일 (2px outline, brand-primary)
- 색상 대비: WCAG AA 이상 (본문 텍스트 최소 4.5:1)
- 이미지: alt 텍스트 필수
- 키보드 네비게이션: Tab 순서 논리적
- 다크모드: prefers-color-scheme 자동 감지 + 수동 토글
- 코드 블록: 가로 스크롤 시 스크롤바 표시
- 모션 감소: prefers-reduced-motion 대응

---

## 11. 파일 구조 (Next.js 기준)

```
src/
├── app/
│   ├── layout.tsx          — 전역 레이아웃 (NavBar, Footer, 테마)
│   ├── page.tsx            — 메인 (카드 피드)
│   ├── commits/
│   ├── articles/
│   ├── techlab/
│   ├── casual/
│   ├── post/[slug]/
│   ├── about/
│   ├── search/
│   └── admin/
├── components/
│   ├── layout/
│   │   ├── NavBar.tsx
│   │   ├── Footer.tsx
│   │   └── ThemeToggle.tsx
│   ├── post/
│   │   ├── PostCard.tsx
│   │   ├── CommitCard.tsx
│   │   ├── PostDetail.tsx
│   │   └── TableOfContents.tsx
│   ├── ui/
│   │   ├── CategoryTabs.tsx
│   │   ├── TagFilter.tsx
│   │   ├── Badge.tsx
│   │   └── SearchBar.tsx
│   └── about/
│       ├── ProfileSection.tsx
│       └── ProjectCard.tsx
├── styles/
│   └── globals.css         — CSS 변수, 리셋, 타이포
└── lib/
    ├── fonts.ts            — Pretendard, JetBrains Mono 설정
    └── theme.ts            — 다크모드 로직
```
