# 구현 검토: Analytics 일별 집계 전환

- **일시:** 2026-03-11
- **대상 커밋:** `642b28e` (feat: Analytics를 일별 집계(DailyAnalytics)로 전환)
- **설계 기준:** 회의록 결정 사항 1번

---

## 매치율 요약

| 항목 | 점수 | 상태 |
|------|:----:|:----:|
| DailyAnalytics 모델 정의 | 100% | PASS |
| Post.viewCount 비정규화 | 100% | PASS |
| Upsert + viewCount 트랜잭션 | 100% | PASS |
| Admin Analytics 쿼리 전환 | 95% | PASS (minor) |
| ViewTracker 중복 방지 | 90% | PASS (minor) |
| React cache 이중 쿼리 제거 | 100% | PASS |
| 데이터 마이그레이션 SQL | 95% | PASS (minor) |
| 봇 필터링 | 0% | FAIL |
| **전체** | **85%** | |
| **결정 사항 1번 한정** | **98%** | PASS |

---

## 파일별 검토

### prisma/schema.prisma — 100%

- `DailyAnalytics` 모델: `@@unique([postId, date])`, `@db.Date`, `views Int`, 인덱스 모두 정확
- `Post.viewCount Int @default(0)` 추가 완료
- 기존 `Analytics` 모델 완전 제거 확인
- `onDelete: Cascade` 설정으로 Post 삭제 시 데이터 정합성 보장

### src/app/api/track/route.ts — 95%

- `prisma.$transaction`으로 upsert + viewCount increment 원자성 보장
- `today.setHours(0,0,0,0)`으로 날짜 정규화 정확
- referrer/userAgent 불필요한 데이터 수집 제거
- **미구현:** 봇 필터링 (결정 사항에 미포함, ViewTracker가 클라이언트 컴포넌트이므로 대부분 자연 필터링)

### src/app/api/admin/analytics/route.ts — 95%

- `DailyAnalytics` 기준 쿼리로 전환 완료
- `DATE("createdAt")` raw SQL 제거 → `groupBy({ by: ["date"] })` 인덱스 활용
- 총 조회수, Top 10, 일별 추이 쿼리 모두 전환
- **카테고리별 쿼리:** JOIN 필요로 raw SQL 잔존, 그러나 `date` 인덱스 활용 중이므로 기존 full scan 문제는 해소

### ViewTracker.tsx — 90%

- `sessionStorage` 기반 세션 내 중복 방지 구현
- `postId`만 전송 (referrer/userAgent 제거로 데이터 절감)
- **봇 필터링 미구현**, 단 클라이언트 컴포넌트이므로 JS 미실행 봇은 자연 필터링됨

### post/[slug]/page.tsx — 100%

- `React.cache`로 `getPost()` 래핑 → `generateMetadata`와 `PostPage` 간 이중 DB 조회 제거
- 동일 렌더 사이클 내 쿼리 1회로 감소

### prisma/migrate-analytics.sql — 95%

- `INSERT ... SELECT ... GROUP BY ... ON CONFLICT DO UPDATE` 패턴 정확
- `Post.viewCount` 초기화 SQL 포함
- `DROP TABLE` 주석 처리로 안전한 마이그레이션
- **Minor:** ID 생성이 `gen_random_uuid()` (UUID)이나 Prisma는 CUID 사용 — 기능적 영향 없음

---

## 미구현 / 향후 개선 항목

| 항목 | 우선순위 | 설명 |
|------|----------|------|
| 봇 필터링 | Low | ViewTracker가 클라이언트 컴포넌트이므로 대부분 자연 필터링. headless browser 대응만 추가 검토 |
| admin analytics `force-dynamic` | 결정 사항 2번 | ISR 전환 작업에서 일괄 처리 예정 |
| 카테고리별 쿼리 Prisma 전환 | Very Low | JOIN 필요 구조이므로 raw SQL 유지가 합리적 |

---

## 예상 효과

| 지표 | 변경 전 (row-per-view) | 변경 후 (일별 집계) | 개선율 |
|------|:----------------------:|:-------------------:|:------:|
| 일 1,000뷰 시 월간 row 증가 | ~30,000 | ~3,000 (글 100개 기준) | 90% 감소 |
| row당 크기 | ~300B (id+postId+referrer+userAgent+views+createdAt) | ~50B (id+postId+date+views) | 83% 감소 |
| 월간 스토리지 증가 | ~9MB | ~150KB | 98% 감소 |
| 일별 조회수 쿼리 | raw SQL + full scan | Prisma groupBy + index scan | 인덱스 활용 |
| 조회수 총합 | COUNT/SUM on 전체 row | Post.viewCount 직접 조회 | JOIN 제거 |
| 세션 내 중복 카운트 | 제한 없음 | sessionStorage로 1회 제한 | 중복 제거 |

---

## 배포 체크리스트

- [ ] `npx prisma db push` — 새 스키마 반영
- [ ] `migrate-analytics.sql` 실행 — 기존 데이터 이관 (데이터가 있는 경우)
- [ ] 기존 `Analytics` 테이블 확인 후 DROP
- [ ] admin 대시보드에서 통계 정상 표시 확인
- [ ] 글 상세 페이지 방문 후 DailyAnalytics row 생성 확인

---

## 결론

결정 사항 1번(Analytics 일별 집계 전환)은 **98% 수준으로 구현 완료**. 추가 작업 없이 다음 단계(결정 사항 2번 ISR 전환)로 진행 가능.
