# 팀 회의록: 데이터베이스 최적화

- **일시:** 2026-03-11
- **주제:** 블로그 글 저장 시 데이터베이스 최적화 — 글 증가에 따른 비용 문제
- **참석자:** 백엔드 개발자 x2, DBA x1, 인프라 엔지니어 x1, 기획자 x1, PD x1

---

## 배경

"이더" 테크블로그는 GitHub 커밋을 감지하여 AI가 자동으로 블로그 글을 생성한다.
글이 자동으로 빠르게 증가하므로, Railway PostgreSQL의 사용량 기반 과금 구조에서
장기적으로 DB 비용이 문제될 수 있다.

---

## 역할별 핵심 의견

### 백엔드 #1 — 스토리지/아키텍처 관점

- **Post.content(마크다운 전문)는 현 규모에서 문제 아님.** 글 1,000편 = 5~15MB로 유의미한 비용이 아니다.
- **진짜 비용 폭탄은 Analytics 테이블.** 매 조회마다 `prisma.analytics.create()`로 row를 무조건 INSERT하는 row-per-view 구조. 일 1,000PV이면 월 30,000 rows.
- 글 상세 페이지(`post/[slug]`)에서 `generateMetadata`와 `PostPage`가 동일 글을 2회 DB 조회하는 비효율 존재.
- 커밋 페이지에 페이지네이션이 없어 글이 쌓이면 전량 로드됨.

**제안:**
1. Analytics를 일별 집계 카운터(DailyAnalytics + Post.viewCount 비정규화)로 전환 → row 90%+ 감소
2. React `cache`로 상세 페이지 이중 쿼리 제거 (3줄)
3. 커밋 페이지 페이지네이션 추가

### 백엔드 #2 — Analytics/쿼리 최적화 관점

- Analytics의 `views` 필드는 항상 `@default(1)`로 생성만 되고 increment 안 됨 — **사실상 죽은 필드.**
- `/api/admin/analytics`의 raw SQL이 `DATE("createdAt")` 함수 사용 → `@@index([createdAt])` 인덱스 활용 불가, full scan 발생.
- 봇/크롤러 필터링 부재 — Google Bot 등의 크롤링도 전부 조회수로 카운트.
- ~~Umami가 이미 referrer, user agent, 일별/페이지별 조회수를 모두 추적 중~~ → **[정정] Umami는 스크립트만 준비되어 있고, `WEBSITE_ID`가 미설정으로 비활성 상태.** 자체 Analytics가 유일한 조회 추적 수단.

**제안:**
1. PostDailyStats 테이블(`@@unique([postId, date])`) + upsert 패턴으로 전환
2. Post.viewCount 캐시 필드 추가 (트랜잭션으로 동시 갱신)
3. 기존 데이터 마이그레이션 SQL 제공
4. 예상 효과: 월간 스토리지 증가 9MB → 150KB (95%+ 절감)

### DBA — 스키마/인덱스 관점

- Post.content의 TOAST 디컴프레션 오버헤드 — 목록 쿼리에서 content 동반 로드 시 불필요한 I/O 발생.
- **저카디널리티 단독 인덱스 문제:** `published`(Boolean, 카디널리티 2), `category`(enum 4개) 단독 인덱스는 실효성이 낮다.
- 실제 쿼리 패턴(`WHERE published=true AND category='commits' ORDER BY createdAt DESC`)을 커버하는 복합 인덱스가 없다.
- `tags String[]`에 GIN 인덱스가 없어 태그 필터링 시 full table scan.

**제안:**
1. content를 PostContent 테이블로 수직 분할 (Post row 크기 ~30KB → ~500 bytes)
2. 복합 인덱스 재설계: `[published, category, createdAt DESC]`, `[published, createdAt DESC]`
3. Analytics 일별 집계로 전환 (Umami 비활성 상태이므로 제거 불가 — 활성화 후 재검토)
4. tags에 GIN 인덱스 추가 (마이그레이션 SQL)
5. 장기: 오래된 content를 Cloudflare R2로 이관

### 인프라 엔지니어 — 호스팅/비용 관점

- **스토리지($0.25/GB)보다 컴퓨팅(vCPU-초) 과금이 진짜 비용 드라이버.**
- `force-dynamic` 전역 설정으로 모든 방문이 DB 쿼리를 트리거 — 캐싱 레이어가 전혀 없다.
- ~~Analytics 테이블 + Umami = 이중 과금 구조.~~ **[정정] Umami는 비활성 상태. 현재 자체 Analytics만 동작 중.**
- 자동 글 생성 → DB 쓰기 → 조회 트래픽 → 비용 자동 증가 루프.

**제안:**
1. `force-dynamic` 제거 + ISR 전환(`revalidate = 3600`) → DB 쿼리 90%+ 감소
2. ~~Analytics 테이블 제거 (Umami로 일원화)~~ **[정정] Umami 비활성 → 집계 전환 우선, Umami 활성화 후 재검토**
3. Neon PostgreSQL 무료 티어 이전 검토 (DATABASE_URL만 교체, DB 비용 → $0)
4. Webhook 처리 후 on-demand revalidation 연결
5. 장기: Vercel 이전 또는 Cloudflare CDN 추가

### 기획자 — 서비스/비즈니스 관점

- 수익화 없는 개인 블로그에서 AI 자동 생성으로 글이 무한 증가하는 구조는 **비용 대비 가치가 급격히 하락.**
- 커밋 자동 글 중 "README 오타 수정", "의존성 업데이트" 같은 가치 없는 글이 대량 생산될 가능성.
- 노이즈 콘텐츠가 많으면 검색/탐색 경험 악화, 블로그 신뢰도 하락.

**제안:**
1. 커밋 필터링 규칙: `docs:`, `chore:`, `style:` 등 단순 커밋은 자동 생성 제외
2. 커밋 묶음(Batch) 생성: 개별 커밋이 아닌 하루/PR 단위로 하나의 요약 글 생성 (글 수 5~10배 감소)
3. 일일/주간 생성 상한: 주 3~5건 이하
4. 카테고리별 보관 정책: commits는 최근 100건만 DB 보관, articles는 영구 보관
5. 조회수 기반 정리: 30일간 조회 0인 글은 비공개 처리

### PD — 프로젝트 전체 관점

- **현 시점 Post 테이블 최적화는 우선순위 밖.** 1,000건 미만에서 오버엔지니어링 위험.
- ~~AI 글 생성 API 호출 비용(Claude API)이 DB 월 비용보다 높을 가능성.~~ **[정정] 실제로는 Z.ai GLM-4 모델 사용 (Claude가 아님). 비용 구조 다름.**
- 같은 시간에 SEO, 글 품질 개선, 독자 확보 작업이 프로젝트 생존에 더 기여.

**제안:** 단계적 접근
- Phase 0 (즉시): Analytics 테이블 정리 + 비용 모니터링 설정 — 0.5일
- Phase 1 (글 500건 도달 시): Pagination 개선 — 1일
- Phase 2 (글 2,000건 도달 시): 아카이빙 정책 + 인프라 재검토 — 2~3일

---

## 공통 합의점

| # | 합의 사항 | 동의 |
|---|-----------|------|
| 1 | **Analytics 테이블이 최우선 개선 대상** (row-per-view → 집계 or 제거) | 전원 (6/6) |
| 2 | ~~Umami와 자체 Analytics가 중복~~ **[정정] Umami 비활성 → Analytics 집계 전환 우선** | 백엔드#2, DBA, 인프라 |
| 3 | **Post.content 스토리지는 현 규모에서 문제 아님** | 백엔드#1, 인프라, PD |
| 4 | **글 생성 자체를 제어하는 정책 필요** (필터링, 배치, 상한) | 기획자, PD |
| 5 | **ISR/캐싱으로 DB 쿼리 자체를 줄여야 함** | 인프라, PD |

---

## 주요 쟁점

| 쟁점 | 찬성 | 반대/보류 |
|------|------|-----------|
| content 테이블 분리(수직 분할) | DBA (즉시) | 백엔드#1, PD (현재 불필요) |
| 인덱스 전면 재설계 | DBA (복합 인덱스) | PD (현 규모에서 체감 미미) |
| Neon 등 외부 DB 이전 | 인프라 (비용 $0) | PD (마이그레이션 리스크) |
| Analytics 완전 제거 vs 집계 전환 | DBA, 인프라 (제거) | 백엔드#1, #2 (집계로 유지) |

---

## 2차·3차 점검 결과 (코드 검증)

회의 후 실제 코드를 검증하여 다음 **4건의 오류를 발견·정정**함:

| #   | 회의 결론                                         | 실제 코드                                                          | 영향                                          |
| --- | ------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| 1   | "Umami가 이미 통계 추적 중, Analytics와 중복"     | **Umami 비활성 상태** (`WEBSITE_ID` 미설정, 스크립트만 준비)       | Analytics 제거 불가 → 집계 전환이 유일한 방법 |
| 2   | "Claude API (Sonnet) 사용, 비용 높음"             | **Z.ai GLM-4 모델 사용** (`chat.z.ai/api`, 모델 `glm-4`)          | API 비용 구조가 다름, PD의 비용 비교 재검증 필요 |
| 3   | "chore/docs/style 커밋은 필터링됨"                | **메시지 30자 미만일 때만 필터링.** 긴 chore 커밋은 글 생성됨      | 필터링이 예상보다 약함, 조건 강화 필요        |
| 4   | "categoryMapping으로 레포별 카테고리 설정 가능"   | **스키마에만 존재, 코드 미사용.** 모든 자동 글은 `commits` 고정    | 미구현 기능                                   |

### 추가 발견 사항

- **force-dynamic 13개 파일 확인:** 메인, articles, techlab, casual, commits, post/[slug], tag/[tag], series, admin, sitemap, admin/analytics API
- **글 생성 빈도 제한 전무:** rate limit, daily cap, throttle 메커니즘 없음
- **ViewTracker:** 봇 필터링 없음, 중복 방지 없음, sessionStorage/쿠키 체크 없음

---

## 결정 사항 및 다음 액션 (점검 반영)

회의 결과 + 코드 검증을 반영하여, 다음 순서로 단계적 구현을 진행하기로 결정:

1. **[즉시] Analytics 테이블을 일별 집계로 전환**
   - DailyAnalytics 테이블 (`@@unique([postId, date])`) + upsert 패턴
   - Post.viewCount 비정규화 필드 추가
   - ~~Umami 위임~~ → Umami 비활성이므로 자체 집계 유지 필수
2. **[이후] ISR 전환**
   - 13개 페이지의 `force-dynamic` 제거, `revalidate` 설정
   - Webhook 후 on-demand revalidation 연결
3. **[이후] 커밋 생성 정책 강화**
   - trivialPatterns의 30자 조건 제거 (패턴 매칭만으로 필터링)
   - 일일 배치 생성 검토
   - 글 생성 빈도 제한(daily cap) 추가
