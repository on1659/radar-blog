# CHANGELOG

세션 간 진행 기록. 세션 시작 시 필독.

---

## 2026-06-21 — AI Signal 발행 모니터 페이지

사용자 요청: "글이 너무 늦게/불규칙하게 올라간다. 서버 켜지면 웹에서 잘 올리는지 확인하는 페이지 만들어줘." (ThreadsBot UI 참고)

### 진단 (왜 늦고 불규칙한가)
- launchd 스케줄: daily-ai :00/:30, claude-ai :15 → 매시 3회 시도.
- 각 시도가 **게이트에 막혀 조용히 스킵**: daily-ai = `Hourly cap (n/6)` / `fresh items <2`, claude-ai = `Claude 글 2h 쿨다운`. 새 뉴스 소진 시 다음 뉴스 등장까지 스킵 → 본질적으로 버스티.
- 추정 추가 원인: macOS launchd `StartCalendarInterval`은 **잠자는 동안 발화 안 됨**(깨어날 때 1회 합쳐 발화). "켜짐" ≠ "깨어있음" → 늦음/불규칙.
- 그동안 시도/스킵은 로컬 launchd 로그에만 있어 웹에서 안 보였음.

### 구현 (docs/goal/signal-publish-monitor.md)
- **`PublishRun` 테이블 추가** — trigger 1회 = 1행 (job/status/reason/postId/durationMs/createdAt). prod DB에 `CREATE TABLE IF NOT EXISTS`로 surgical 적용(드리프트 위험 회피).
- **두 trigger route**가 posted/skipped/failed + 사유 + 소요시간 기록. `recordPublishRun()`은 best-effort(try-catch)라 발행 흐름 무영향. 응답 계약 불변.
- **`/admin/signal-monitor`** (admin 전용, force-dynamic): 워커 하트비트(최근 트리거 경과시간 <35m 정상/<70m 지연/그외 중단), 오늘 통계(발행/시도/스킵률), 오늘 스킵 사유 분류, 최근 발행 주기(글 간격·90분 초과 시 ⚠️), 트리거 기록 30개, 다음 예정 시각. 30초 자동 새로고침(client island). KST 표기.
- admin 레이아웃에 "발행 모니터" 네비 추가.

### 검증
- `npm run build` 통과(신규 파일 경고 0). 페이지는 기존 admin 대시보드와 동일 렌더(`●` force-dynamic).
- 워커 재시작(`worker.app` bootout/bootstrap) 후 `npm run auto:daily` 1회 → prod에 PublishRun 1행 기록 확인(`skipped: Only 1 fresh items`, 8357ms). end-to-end 로깅 동작.
- commit 110c04d → master push(Railway 자동 배포).

### 주의 / 다음 후보
- **데이터 소스 한계:** trigger가 실제 도는 곳(로컬 워커)에서만 기록됨. GH Actions cron은 현재 `workflow_dispatch` 전용이라 Railway 노이즈 없음.
- 페이지가 "중단됨"이면 Mac 절전/워커 종료 의심 → 절전 방지(`caffeinate`/`pmset`)는 이번 범위 밖(후속 과제).
- "지금 발행" 버튼 미구현: radarlog.kr(Railway)는 로컬 워커(localhost)에 도달 못 하고 AI 키도 없어 불가 — 읽기 전용 모니터로 한정.

## 2026-06-15 (2) — AI 백엔드 Codex로 전환

사용자 요청 "글 올릴 때는 코덱스 자원 쓰자" → shim 백엔드를 `claude -p`에서 **Codex**로 전환.

- shim에 `SHIM_BACKEND` env 추가 (기본 `codex`, `claude` fallback). plist에 `SHIM_BACKEND=codex` + `CODEX_BIN` 설정.
- Codex CLI = `/Applications/Codex.app/Contents/Resources/codex`(데스크톱 앱 번들 CLI, ChatGPT 로그인 인증). PATH엔 없고 앱 번들 안에만 존재.
- `codex exec --output-last-message`로 최종 메시지 캡처. Codex는 에이전트라 뉴스 프롬프트에 웹검색/MCP(node_repl) 리서치 수행 → 158초/134k 토큰. **shim이 `-c mcp_servers={}` + "도구 금지·주어진 정보로 즉시 작성" 가드 주입**으로 ~21초로 억제. JSON 품질은 claude보다 깔끔.
- 검증: codex 직접 호출 + shim 경유 모두 유효 JSON 생성 확인 (21초, 양질 한국어 본문). 글 생성 경로는 post 1496과 동일.
- 라이브 풀파이프라인 codex 포스트는 당시 중복가드(daily-ai 뉴스 소진 / claude-ai 2h 이내)로 대기 — 다음 적격 스케줄에 자동 생성.

## 2026-06-15 — AI Signal 자동 발행 복구 (로컬 claude-CLI 워커 전환)

### 문제
"글이 안 올라간다." 자동 발행이 다층으로 막혀 있었음.

### 근본 원인 (체인)
1. Railway `AUTO_WRITING_ENABLED` 미설정 → trigger가 `skipped` 반환 (게이트 닫힘)
2. 로컬 launchd 스케줄러 한 번도 설치 안 됨 (`auto:install` 미실행 — 플리스트·로그 전무)
3. 로컬 `~/.config/radar-blog/auto-writer.env`의 `BLOG_API_KEY` 비어있음
4. 작업 디렉토리가 엉뚱한 Railway 프로젝트(`text-rpg`)에 링크돼 있었음
5. **진짜 원인:** `chore: remove z.ai provider`로 z.ai를 코드에서 제거했으나 서버에 대체 AI 키를 안 넣음 → 글 생성이 `"AI API key not configured"` 500으로 실패. (서버엔 미사용 잔재 `Z_AI_API_KEY`만 존재)

### 해결 — 로컬 워커 아키텍처 (API 키 0, 로컬 Claude 구독 사용; ThreadsBot 패턴)
```
launchd 스케줄러 → localhost:3939 (radar-blog 로컬 next start)
                 → AI_BASE_URL=localhost:8787 (claude-openai-shim)
                 → claude -p CLI
                 → 운영 DB(DATABASE_PUBLIC_URL) 기록 → radarlog.kr 노출
```
- **추가:** `scripts/claude-openai-shim.mjs` — `claude` CLI를 OpenAI 호환 `/v1/chat/completions`로 감쌈. `claude -p`가 strict JSON을 보장하지 못하는 문제(코드펜스/미이스케이프 따옴표·줄바꿈/거부) 대응: 펜스 제거 + 문자열 내부 제어문자 이스케이프 + 실패 시 claude로 JSON 복구 라운드트립 1회. → radar-blog 앱 코드 0줄 수정으로 재사용.
- **추가:** `scripts/local-blog-worker.sh` — `~/.config/radar-blog/worker.env`(prod DB public URL + AI_* + GITHUB_TOKEN) 로드 후 `next start -p 3939`.
- **설정:** Railway `AUTO_WRITING_ENABLED=true`, 디렉토리 → `radar-blog` 프로젝트 재링크, 로컬 `BLOG_API_KEY` 시드(기존 active 키 재사용), `auto-writer.env` `BLOG_BASE_URL=http://127.0.0.1:3939`.
- **launchd 서비스 4개:** `kr.radarlog.auto-writer.daily-ai`(:00/:30), `kr.radarlog.auto-writer.claude-ai`(:15), `kr.radarlog.worker.app`, `kr.radarlog.worker.shim`.

### 검증
- daily-ai 전체 파이프라인 end-to-end 성공 → post 1496 "AI 업데이트: 경찰의 증거 조작, Luau가 브라우저로" 생성, 검수 통과(score 95), https://radarlog.kr/post/1496 라이브 노출 확인.
- claude-ai(:15) 경로는 동일 코드/shim 사용 (별도 실행 미검증이나 동일 경로).

### 운영 메모 / 주의
- **이 Mac이 24/7 켜져 있어야** 자동 발행됨 (사용자 확인: 항상 켜져 있음).
- **Railway엔 AI 키를 넣지 말 것** — 일부러 로컬 생성 구조. 서버 직접 호출 시 500 나는 게 정상.
- 상태: `npm run auto:status` / 로그: `~/Library/Logs/radar-blog/{app,shim}.{out,err}.log`.
- 워커 코드(스키마/생성 로직) 수정 시 `npm run build` 후 `worker.app` 재시작(launchd bootout/bootstrap).

### 다음 세션 후보 작업
- claude-ai(:15) 트리거 실제 1회 검증.
- shim refusal/복구 발생 빈도 모니터링 (`shim.*.log`), 필요 시 프롬프트 강화.
- (기존 백로그) 소스별 성공률 로깅, RSS 확장, 소스별 요약 톤 분기, 엔티티 태깅, 프론트 소스 아이콘.
