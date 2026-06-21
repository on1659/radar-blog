# goal: signal-publish-monitor

## One-line Goal
An admin-only web page that shows, at a glance, whether the AI Signal auto-publisher is alive and posting on schedule — including *why* it skips when the cadence looks irregular.

## Background / Motivation
The user reports posts go up "too late" and at an irregular cadence rather than the expected ~30-min/1-hour rhythm. Investigation shows this is largely **by design + invisible**:

- launchd fires `daily-ai` at :00 and :30, `claude-ai` at :15 — 3 attempts/hour.
- Each attempt is **gated and silently skips**: daily-ai skips on `Hourly cap reached (n/6)` or `Only n fresh items (need ≥2)`; claude-ai skips on `Claude post exists within 2h`. When unused news runs dry, it skips until new AI news appears → bursty cadence.
- Likely compounding cause: macOS launchd `StartCalendarInterval` does **not** fire while the Mac is asleep; it coalesces and fires once on wake. "On" ≠ "awake" → late + irregular.

Today these attempts/skips exist only in local launchd logs (`~/Library/Logs/radar-blog/*.log`), invisible from the web. The actual posts live in the shared prod DB. To answer "is it posting well, and why is it late," we log every trigger run to the DB and surface it on a monitoring page. UI reference: `~/Work/ThreadsBot/client/src/pages/Dashboard.jsx` (stat-card grid + status badges + run/post list).

## In-scope
- New Prisma model `PublishRun` (job, status, reason, postId, durationMs, createdAt) — one row per trigger attempt.
- Record a run from both trigger routes (`/api/v1/daily-ai/trigger`, `/api/v1/daily-ai/claude-trigger`) for `posted` / `skipped` / `failed`, with timing. Recording must never break the publish flow (best-effort, try/caught).
- Admin page `/admin/signal-monitor` (server component, `force-dynamic`, behind existing admin auth):
  - **Worker heartbeat** card: age of most recent run → healthy (<35m) / delayed (35–70m) / stopped (>70m, server asleep/off). Longest normal gap between fires is 30m (:30 → next :00).
  - **Stat cards** (ThreadsBot style): posts today, last post age, runs today, skip rate today.
  - **Skip-reason breakdown** for today (groups the skip reasons so "irregular" reads as "gated, not broken").
  - **Cadence list**: recent signal posts with the gap between consecutive posts, large gaps flagged.
  - **Run log**: recent ~30 runs with status badge (posted=green / skipped=amber / failed=red), job badge, reason, KST time + time-ago.
  - **Next expected runs**: next fire times derived from the :00/:15/:30 schedule.
  - Auto-refresh (~30s) via a small client island calling `router.refresh()`, plus a manual refresh.
- Nav link in `src/app/[locale]/admin/layout.tsx`.
- All timestamps rendered in Asia/Seoul (KST), matching the existing admin dashboard.

## Out-of-scope
- A "run now / force publish" button. The page is served from radarlog.kr (Railway), which cannot reach the local worker (localhost) or generate posts (no AI key by design). Read-only monitoring only.
- Changing the schedule, the gating thresholds, or fixing macOS sleep behavior. (Sleep mitigation noted in the report as a follow-up, not built.)
- Public visibility — decided admin-only.

## Acceptance Criteria
- [ ] `PublishRun` model added; `prisma generate` succeeds; table exists in prod DB.
- [ ] Both trigger routes write a `PublishRun` row for posted/skipped/failed; a thrown logger never changes the HTTP response.
- [ ] `/admin/signal-monitor` renders heartbeat, stat cards, skip-reason breakdown, cadence, run log, and next-expected-runs; redirects non-admins to `/admin-login`.
- [ ] Heartbeat correctly classifies a >70m gap as "stopped".
- [ ] `npm run build` passes (TypeScript strict, no `any`).
- [ ] Nav link appears in the admin sidebar/top tabs.

## Related Files / Modules
| File | Role |
|------|------|
| `prisma/schema.prisma` | Add `PublishRun` model |
| `src/lib/publish-run.ts` | `recordPublishRun()` best-effort writer (new) |
| `src/app/api/v1/daily-ai/trigger/route.ts` | Record daily-ai run |
| `src/app/api/v1/daily-ai/claude-trigger/route.ts` | Record claude-ai run |
| `src/app/[locale]/admin/signal-monitor/page.tsx` | Monitor page (new) |
| `src/app/[locale]/admin/signal-monitor/AutoRefresh.tsx` | Client auto-refresh island (new) |
| `src/app/[locale]/admin/layout.tsx` | Add nav link |
| `src/lib/generate-daily-ai.ts` | Source of skip reasons / cadence rules (read-only reference) |
| `scripts/install-local-auto-writer.js` | Schedule source of truth (:00/:30, :15) for next-run calc |

## Must-Preserve
- Trigger route response contract: `{ success, data: { skipped, reason } | { postId, skipped } }`, status 201 on create, 500 on error. Logging is additive only.
- Existing HuggingFace/daily-ai pipeline behavior — no regression to generation logic.
- Admin auth gate (`auth()` + `isAdmin` → redirect `/admin-login`).
- Local-worker architecture: no AI keys on Railway; recording happens wherever the trigger actually runs (the local worker), written to the shared prod DB.

## Execution Notes
- Recommended model: Claude Opus 4.8 (current top model) for the judgment-heavy parts — cadence diagnosis, heartbeat thresholds, and the monitor UX. Sonnet acceptable for the mechanical parts (Prisma model, route edits, nav link).
- This document cannot enforce the model — the executing session's `/model` setting decides. This session is running Opus 4.8, which meets the recommendation.

## Deployment (prod-affecting; confirm before running)
1. `prisma generate` + `prisma db push` against the prod DB (additive CREATE TABLE; URL from `~/.config/radar-blog/worker.env`).
2. `npm run build`, then restart the local worker so the route records runs: `launchctl bootout/bootstrap gui/<uid> kr.radarlog.worker.app`.
3. `git commit` + `git push` → Railway deploys the page to radarlog.kr.
