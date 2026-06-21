export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AutoRefresh from "./AutoRefresh";

// launchd 스케줄 (scripts/install-local-auto-writer.js): daily-ai :00/:30, claude-ai :15
const SCHEDULE_MINUTES = [0, 15, 30];
// 정상 발화 간격의 최댓값은 30분(:30 → 다음 :00). 그 여유를 둔 임계값.
const HEARTBEAT_OK_MIN = 35;
const HEARTBEAT_WARN_MIN = 70;
// 정상 발행 주기로 기대하는 상한(이보다 길면 cadence 경고).
const CADENCE_TARGET_MIN = 90;

const KST = "Asia/Seoul";

const minutesSince = (date: Date) => (Date.now() - date.getTime()) / 60000;

const timeAgo = (date: Date) => {
  const mins = Math.floor(minutesSince(date));
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 ${mins % 60}분 전`;
  return `${Math.floor(hours / 24)}일 전`;
};

const fmtKST = (date: Date) =>
  date.toLocaleString("ko-KR", {
    timeZone: KST,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const fmtDuration = (ms?: number | null) => {
  if (ms == null) return "";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

// KST 기준 오늘 0시의 UTC Date.
const startOfTodayKST = () => {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 3600 * 1000;
  const kst = new Date(kstMs);
  const dayStartKstMs = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());
  return new Date(dayStartKstMs - 9 * 3600 * 1000);
};

// 다음 발화 예정 시각 n개 (현재 시각 기준, :00/:15/:30).
const nextRuns = (count: number) => {
  const out: Date[] = [];
  const cursor = new Date();
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  while (out.length < count) {
    if (SCHEDULE_MINUTES.includes(cursor.getMinutes())) out.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return out;
};

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  posted: { label: "발행", bg: "#22c55e22", color: "#16a34a" },
  skipped: { label: "스킵", bg: "#eab30822", color: "#ca8a04" },
  failed: { label: "실패", bg: "#ef444422", color: "#dc2626" },
};

const JOB_STYLE: Record<string, { label: string; color: string }> = {
  "daily-ai": { label: "daily-ai", color: "#06B6D4" },
  "claude-ai": { label: "claude-ai", color: "#8b5cf6" },
};

const Badge = ({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) => (
  <span
    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-tag font-semibold"
    style={{ background: bg, color, border: `1px solid ${color}44` }}
  >
    {children}
  </span>
);

const StatCard = ({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) => (
  <div className="rounded-xl border border-border p-4">
    <div className="text-2xl font-bold" style={accent ? { color: accent } : undefined}>{value}</div>
    <div className="text-meta text-text-tertiary">{label}</div>
    {sub && <div className="mt-0.5 text-meta text-text-muted">{sub}</div>}
  </div>
);

const SignalMonitor = async () => {
  const todayStart = startOfTodayKST();

  const [runs, runsToday, lastPost, recentPosts] = await Promise.all([
    prisma.publishRun.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.publishRun.findMany({
      where: { createdAt: { gte: todayStart } },
      select: { status: true, reason: true },
    }),
    prisma.post.findFirst({
      where: { category: "signal" },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, slug: true, createdAt: true },
    }),
    prisma.post.findMany({
      where: { category: "signal" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, title: true, slug: true, createdAt: true, tags: true },
    }),
  ]);

  // ── 워커 하트비트 (가장 최근 트리거 기록 기준) ──
  const lastRun = runs[0];
  const lastRunMin = lastRun ? minutesSince(lastRun.createdAt) : null;
  const heartbeat =
    lastRunMin == null
      ? { label: "기록 없음", color: "#6b7280", desc: "아직 트리거 기록이 없습니다." }
      : lastRunMin < HEARTBEAT_OK_MIN
        ? { label: "정상 가동 중", color: "#16a34a", desc: "스케줄러가 정상적으로 돌고 있습니다." }
        : lastRunMin < HEARTBEAT_WARN_MIN
          ? { label: "지연", color: "#ca8a04", desc: "예상보다 트리거가 늦습니다. 곧 따라잡을 수 있습니다." }
          : { label: "중단됨", color: "#dc2626", desc: "트리거가 멈췄습니다. Mac이 잠들었거나(절전) 워커가 꺼졌을 수 있습니다." };

  // ── 오늘 통계 ──
  const postedToday = runsToday.filter((r) => r.status === "posted").length;
  const skippedToday = runsToday.filter((r) => r.status === "skipped").length;
  const failedToday = runsToday.filter((r) => r.status === "failed").length;
  const totalToday = runsToday.length;
  const skipRate = totalToday > 0 ? Math.round((skippedToday / totalToday) * 100) : 0;

  // ── 오늘 스킵 사유 분류 (irregular = gated 임을 보여줌) ──
  const skipReasons = new Map<string, number>();
  for (const r of runsToday) {
    if (r.status !== "skipped") continue;
    const key = (r.reason || "사유 없음").replace(/\(\d+.*?\)/g, "").trim() || "사유 없음";
    skipReasons.set(key, (skipReasons.get(key) ?? 0) + 1);
  }
  const skipReasonList = [...skipReasons.entries()].sort((a, b) => b[1] - a[1]);

  // ── 발행 주기 (연속 글 사이 간격) ──
  const cadence = recentPosts.map((post, i) => {
    const prev = recentPosts[i + 1];
    const gapMin = prev ? Math.round((post.createdAt.getTime() - prev.createdAt.getTime()) / 60000) : null;
    return { ...post, gapMin };
  });

  const upcoming = nextRuns(3);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-section-title">AI Signal 발행 모니터</h1>
        <AutoRefresh seconds={30} />
      </div>

      {/* 하트비트 */}
      <div className="mb-6 rounded-xl border p-5" style={{ borderColor: `${heartbeat.color}55`, background: `${heartbeat.color}0d` }}>
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: heartbeat.color }} />
          <span className="text-sub-heading" style={{ color: heartbeat.color }}>{heartbeat.label}</span>
          {lastRun && (
            <span className="text-meta text-text-tertiary">
              마지막 트리거 {timeAgo(lastRun.createdAt)} ({fmtKST(lastRun.createdAt)})
            </span>
          )}
        </div>
        <p className="mt-1.5 text-card-desc text-text-secondary">{heartbeat.desc}</p>
        <p className="mt-2 text-meta text-text-muted">
          다음 예정: {upcoming.map((d) => fmtKST(d).split(" ").slice(-1)[0]).join(" · ")}
          <span className="ml-1">(스케줄 매시 :00 · :15 · :30)</span>
        </p>
      </div>

      {/* 오늘 통계 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="오늘 발행" value={`${postedToday}`} accent="#16a34a" />
        <StatCard
          label="마지막 발행"
          value={lastPost ? timeAgo(lastPost.createdAt) : "없음"}
          sub={lastPost ? fmtKST(lastPost.createdAt) : undefined}
        />
        <StatCard label="오늘 시도" value={`${totalToday}`} sub={`스킵 ${skippedToday} · 실패 ${failedToday}`} />
        <StatCard label="스킵률" value={`${skipRate}%`} accent={skipRate > 80 ? "#ca8a04" : undefined} />
      </div>

      {/* 발행 주기 안내 */}
      <p className="mb-6 rounded-lg border border-border-light bg-bg-secondary px-4 py-3 text-meta text-text-secondary">
        💡 스케줄러는 매시 3번(:00·:15·:30) 시도하지만, <b>새 뉴스가 없거나(2개 미만)·시간당 6글 상한·Claude 글 2시간 쿨다운</b>에
        걸리면 글을 건너뜁니다. 그래서 발행 간격이 들쭉날쭉한 건 대개 고장이 아니라 <b>게이트에 막힌</b> 정상 동작입니다.
        트리거 자체가 끊기면(위 “중단됨”) Mac 절전/워커 종료를 의심하세요.
      </p>

      {/* 오늘 스킵 사유 */}
      {skipReasonList.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sub-heading">오늘 스킵 사유</h2>
          <div className="flex flex-wrap gap-2">
            {skipReasonList.map(([reason, count]) => (
              <span key={reason} className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-meta">
                {reason} <span className="font-semibold text-text-tertiary">×{count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 발행 주기 (최근 글 간격) */}
      <section className="mb-8">
        <h2 className="mb-3 text-sub-heading">최근 발행 주기</h2>
        <div className="divide-y divide-border-light rounded-xl border border-border">
          {cadence.map((post) => {
            const lateGap = post.gapMin != null && post.gapMin > CADENCE_TARGET_MIN;
            return (
              <div key={post.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-[68px] flex-shrink-0 text-meta tabular-nums text-text-tertiary">
                  {fmtKST(post.createdAt).split(" ").slice(-1)[0]}
                </span>
                <Link href={`/post/${post.slug}`} className="min-w-0 flex-1 truncate text-card-desc hover:text-brand-primary">
                  {post.title}
                </Link>
                {post.gapMin != null && (
                  <span
                    className="flex-shrink-0 text-meta tabular-nums"
                    style={{ color: lateGap ? "#ca8a04" : "var(--text-muted)" }}
                  >
                    +{post.gapMin >= 60 ? `${Math.floor(post.gapMin / 60)}시간 ${post.gapMin % 60}분` : `${post.gapMin}분`}
                    {lateGap && " ⚠️"}
                  </span>
                )}
              </div>
            );
          })}
          {cadence.length === 0 && (
            <div className="px-4 py-8 text-center text-text-muted">발행된 Signal 글이 없습니다.</div>
          )}
        </div>
      </section>

      {/* 트리거 기록 */}
      <section>
        <h2 className="mb-3 text-sub-heading">트리거 기록 (최근 30회)</h2>
        <div className="divide-y divide-border-light rounded-xl border border-border">
          {runs.map((run) => {
            const st = STATUS_STYLE[run.status] ?? { label: run.status, bg: "#6b728022", color: "#6b7280" };
            const job = JOB_STYLE[run.job] ?? { label: run.job, color: "#6b7280" };
            return (
              <div key={run.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                <Badge bg={st.bg} color={st.color}>{st.label}</Badge>
                <Badge bg={`${job.color}18`} color={job.color}>{job.label}</Badge>
                {run.reason && run.status !== "posted" && (
                  <span className="min-w-0 flex-1 truncate text-card-desc text-text-secondary">{run.reason}</span>
                )}
                {run.status === "posted" && run.postId && (
                  <span className="min-w-0 flex-1 truncate text-card-desc text-text-secondary">글 생성됨 · {run.postId}</span>
                )}
                <span className="ml-auto flex-shrink-0 text-meta tabular-nums text-text-tertiary">
                  {fmtDuration(run.durationMs) && <span className="mr-2 text-text-muted">{fmtDuration(run.durationMs)}</span>}
                  {timeAgo(run.createdAt)}
                </span>
              </div>
            );
          })}
          {runs.length === 0 && (
            <div className="px-4 py-10 text-center text-text-muted">
              아직 트리거 기록이 없습니다. 워커가 한 번 실행되면 여기에 표시됩니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SignalMonitor;
