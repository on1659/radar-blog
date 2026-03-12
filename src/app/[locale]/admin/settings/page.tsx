"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, GitBranch, Copy, Check, Info, RefreshCw, Webhook,
  Shield, Server, Bot, Save, ChevronDown, ChevronUp,
} from "lucide-react";

/* ───── Types ───── */

interface RepoItem {
  id: string;
  owner: string;
  name: string;
  branch: string;
  active: boolean;
  autoPublish: boolean;
  promptTemplate: string | null;
}

interface EnvItem {
  key: string;
  label: string;
  group: string;
  set: boolean;
}

interface AiProvider {
  id: string;
  label: string;
  connected: boolean;
}

/* ───── AI Provider → Model mapping ───── */

const AI_MODELS: Record<string, { label: string; value: string }[]> = {
  anthropic: [
    { label: "Claude Sonnet 4", value: "claude-sonnet-4-20250514" },
    { label: "Claude Haiku 4.5", value: "claude-haiku-4-5-20251001" },
    { label: "Claude Opus 4", value: "claude-opus-4-20250514" },
  ],
  openai: [
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4o mini", value: "gpt-4o-mini" },
    { label: "GPT-4.1", value: "gpt-4.1" },
    { label: "GPT-4.1 mini", value: "gpt-4.1-mini" },
    { label: "o3", value: "o3" },
    { label: "o4 mini", value: "o4-mini" },
  ],
  google: [
    { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
    { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
    { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
  ],
  xai: [
    { label: "Grok 3", value: "grok-3" },
    { label: "Grok 3 Mini", value: "grok-3-mini" },
  ],
  zai: [
    { label: "GLM-4", value: "glm-4" },
    { label: "GLM-4 Plus", value: "glm-4-plus" },
  ],
};

/* ───── Collapsible Section ───── */

const Section = ({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-bg-secondary"
      >
        <h2 className="flex items-center gap-2 text-sub-heading">
          <Icon size={18} /> {title}
        </h2>
        {open ? (
          <ChevronUp size={16} className="text-text-muted" />
        ) : (
          <ChevronDown size={16} className="text-text-muted" />
        )}
      </button>
      {open && <div className="border-t border-border px-5 py-5">{children}</div>}
    </section>
  );
};

/* ───── Main Page ───── */

const AdminSettingsPage = () => {
  // env status
  const [envItems, setEnvItems] = useState<EnvItem[]>([]);
  const [aiProviders, setAiProviders] = useState<AiProvider[]>([]);

  // site settings (DB)
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // repos
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [repoBranch, setRepoBranch] = useState("main");
  const [repoAutoPublish, setRepoAutoPublish] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [rehooking, setRehooking] = useState(false);
  const [rehookResult, setRehookResult] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/github`
      : "/api/webhooks/github";

  /* ───── Fetch ───── */

  const fetchEnvStatus = async () => {
    try {
      const res = await fetch("/api/admin/env-status");
      const data = await res.json();
      if (data.success) {
        setEnvItems(data.data.envStatus);
        setAiProviders(data.data.aiProviders);
      }
    } catch {
      /* silent */
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.success) setSettings(data.data);
    } catch {
      /* silent */
    }
  };

  const fetchRepos = async () => {
    try {
      const res = await fetch("/api/admin/repos");
      const data = await res.json();
      if (data.success) setRepos(data.data);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchEnvStatus();
    fetchSettings();
    fetchRepos();
  }, []);

  /* ───── Settings actions ───── */

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSettingsSaved(false);
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2000);
      }
    } catch {
      alert("설정 저장에 실패했습니다.");
    } finally {
      setSettingsSaving(false);
    }
  };

  /* ───── Repo actions ───── */

  const addRepo = async () => {
    if (!repoOwner.trim() || !repoName.trim()) return;
    try {
      const res = await fetch("/api/admin/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: repoOwner,
          name: repoName,
          branch: repoBranch,
          autoPublish: repoAutoPublish,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRepoOwner("");
        setRepoName("");
        setRepoBranch("main");
        setRepoAutoPublish(false);
        fetchRepos();
      }
    } catch {
      alert("레포 추가에 실패했습니다.");
    }
  };

  const deleteRepo = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/admin/repos/${id}`, { method: "DELETE" });
    fetchRepos();
  };

  const savePrompt = async (id: string) => {
    await fetch(`/api/admin/repos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptTemplate: promptValue || null }),
    });
    setEditingPrompt(null);
    fetchRepos();
  };

  const rehook = async () => {
    setRehooking(true);
    setRehookResult("");
    try {
      const res = await fetch("/api/admin/repos/rehook", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setRehookResult(`완료: ${data.data.ok}/${data.data.total}개 webhook 설치`);
        fetchRepos();
      } else {
        setRehookResult(`실패: ${data.error}`);
      }
    } catch {
      setRehookResult("오류가 발생했습니다.");
    } finally {
      setRehooking(false);
    }
  };

  const syncRepos = async () => {
    setSyncing(true);
    setSyncResult("");
    try {
      const res = await fetch("/api/admin/repos/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const { newCount, added } = data.data;
        setSyncResult(
          newCount > 0
            ? `${newCount}개 추가됨: ${added.join(", ")}`
            : "새 레포 없음",
        );
        fetchRepos();
      } else {
        setSyncResult(`실패: ${data.error}`);
      }
    } catch {
      setSyncResult("오류가 발생했습니다.");
    } finally {
      setSyncing(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  /* ───── Env grouping ───── */

  const envGroupLabels: Record<string, string> = {
    core: "핵심",
    ai: "AI",
    github: "GitHub",
    analytics: "통계",
  };

  const grouped = envItems.reduce<Record<string, EnvItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  const setCount = envItems.filter((e) => e.set).length;

  /* ───── Render ───── */

  return (
    <div className="space-y-6">
      <h1 className="text-section-title">설정</h1>

      {/* ── 1. 환경 변수 상태 ── */}
      <Section title="환경 변수 상태" icon={Server} defaultOpen={false}>
        <p className="mb-4 text-meta text-text-tertiary">
          서버에 설정된 환경변수 현황입니다. 값 변경은 Railway 대시보드에서 해주세요.
          <span className="ml-2 font-semibold text-text-secondary">
            {setCount}/{envItems.length}개 설정됨
          </span>
        </p>
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <h3 className="mb-2 text-meta font-semibold text-text-secondary">
                {envGroupLabels[group] || group}
              </h3>
              <div className="divide-y divide-border-light rounded-lg border border-border">
                {items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          item.set ? "bg-cat-commits" : "bg-cat-casual"
                        }`}
                      />
                      <span className="text-card-desc">{item.label}</span>
                      <code className="text-[0.7rem] text-text-muted">{item.key}</code>
                    </div>
                    <span className={`text-meta font-medium ${item.set ? "text-cat-commits" : "text-cat-casual"}`}>
                      {item.set ? "설정됨" : "미설정"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 2. 사이트 설정 ── */}
      <Section title="사이트 설정" icon={Shield}>
        <div className="space-y-4">
          {[
            { key: "site_title", label: "블로그 제목", placeholder: "이더.dev" },
            { key: "site_description", label: "블로그 설명", placeholder: "코드를 쓰면, 글이 된다." },
            { key: "site_url", label: "사이트 URL", placeholder: "https://..." },
            { key: "author_name", label: "저자 이름", placeholder: "이더" },
            { key: "author_role", label: "저자 직함", placeholder: "UE5 C++ 게임 프로그래머" },
            { key: "author_email", label: "이메일", placeholder: "user@example.com" },
            { key: "author_github", label: "GitHub URL", placeholder: "https://github.com/..." },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="mb-1 block text-meta font-medium text-text-secondary">
                {label}
              </label>
              <input
                value={settings[key] ?? ""}
                onChange={(e) => updateSetting(key, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-card-desc outline-none focus:border-brand-primary"
              />
            </div>
          ))}
          <button
            onClick={saveSettings}
            disabled={settingsSaving}
            className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-5 py-2.5 text-meta font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {settingsSaved ? (
              <><Check size={14} /> 저장됨</>
            ) : settingsSaving ? (
              "저장 중..."
            ) : (
              <><Save size={14} /> 저장</>
            )}
          </button>
        </div>
      </Section>

      {/* ── 3. AI 글 생성 설정 ── */}
      <Section title="AI 글 생성 설정" icon={Bot}>
        <div className="space-y-6">
          {/* 1차: 프로바이더 선택 */}
          <div>
            <label className="mb-2 block text-meta font-medium text-text-secondary">
              AI 프로바이더
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {aiProviders.map((provider) => {
                const selected = (settings["ai_provider"] ?? "anthropic") === provider.id;
                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      updateSetting("ai_provider", provider.id);
                      // 프로바이더 변경 시 해당 프로바이더의 첫 모델로 자동 설정
                      const models = AI_MODELS[provider.id];
                      if (models?.[0]) updateSetting("ai_model", models[0].value);
                    }}
                    className={`relative rounded-lg border px-4 py-3 text-left transition-all ${
                      selected
                        ? "border-brand-primary bg-[rgba(49,130,246,0.08)]"
                        : "border-border hover:border-text-muted"
                    }`}
                  >
                    <div className="text-card-desc font-medium">{provider.label}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          provider.connected ? "bg-cat-commits" : "bg-cat-casual"
                        }`}
                      />
                      <span className="text-[0.7rem] text-text-muted">
                        {provider.connected ? "연결됨" : "연결 안 됨"}
                      </span>
                    </div>
                    {selected && (
                      <div className="absolute right-2 top-2">
                        <Check size={14} className="text-brand-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {(() => {
              const selectedProvider = aiProviders.find(
                (p) => p.id === (settings["ai_provider"] ?? "anthropic"),
              );
              if (selectedProvider && !selectedProvider.connected) {
                return (
                  <p className="mt-2 text-meta text-cat-casual">
                    Railway 환경변수에 해당 API Key를 설정해주세요.
                  </p>
                );
              }
              return null;
            })()}
          </div>

          {/* 2차: 모델 선택 */}
          <div>
            <label className="mb-1 block text-meta font-medium text-text-secondary">
              모델
            </label>
            <select
              value={
                settings["ai_model"] ??
                (AI_MODELS[settings["ai_provider"] ?? "anthropic"]?.[0]?.value || "")
              }
              onChange={(e) => updateSetting("ai_model", e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-card-desc outline-none focus:border-brand-primary"
            >
              {(AI_MODELS[settings["ai_provider"] ?? "anthropic"] ?? []).map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* 기타 설정 */}
          <div>
            <label className="mb-1 block text-meta font-medium text-text-secondary">
              기본 글 언어
            </label>
            <select
              value={settings["ai_locale"] ?? "ko"}
              onChange={(e) => updateSetting("ai_locale", e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-card-desc outline-none focus:border-brand-primary"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-meta font-medium text-text-secondary">
              자동 발행
            </label>
            <label className="flex items-center gap-2 text-card-desc">
              <input
                type="checkbox"
                checked={settings["ai_auto_publish"] === "true"}
                onChange={(e) =>
                  updateSetting("ai_auto_publish", e.target.checked ? "true" : "false")
                }
                className="rounded"
              />
              커밋 감지 시 글을 자동으로 발행 (체크 해제 시 임시저장)
            </label>
          </div>
          <div>
            <label className="mb-1 block text-meta font-medium text-text-secondary">
              글 생성 최소 커밋 수
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={settings["ai_min_commits"] ?? "1"}
              onChange={(e) => updateSetting("ai_min_commits", e.target.value)}
              className="w-32 rounded-lg border border-border bg-bg-primary px-3 py-2 text-card-desc outline-none focus:border-brand-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-meta font-medium text-text-secondary">
              기본 시스템 프롬프트 (전역)
            </label>
            <textarea
              rows={5}
              value={settings["ai_system_prompt"] ?? ""}
              onChange={(e) => updateSetting("ai_system_prompt", e.target.value)}
              placeholder="AI에게 전달할 전역 시스템 프롬프트. 레포별 프롬프트가 있으면 합쳐집니다."
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 font-code text-code-block outline-none focus:border-brand-primary"
            />
          </div>
          <button
            onClick={saveSettings}
            disabled={settingsSaving}
            className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-5 py-2.5 text-meta font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {settingsSaved ? (
              <><Check size={14} /> 저장됨</>
            ) : settingsSaving ? (
              "저장 중..."
            ) : (
              <><Save size={14} /> 저장</>
            )}
          </button>
        </div>
      </Section>

      {/* ── 5. GitHub 감시 레포 ── */}
      <Section title="GitHub 감시 레포" icon={GitBranch}>
        {/* 액션 버튼 */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={rehook}
            disabled={rehooking}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-meta font-medium text-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
          >
            <Webhook size={14} className={rehooking ? "animate-spin" : ""} />
            {rehooking ? "설치 중..." : "Webhook 재설치"}
          </button>
          <button
            onClick={syncRepos}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-meta font-medium text-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "동기화 중..." : "레포 동기화"}
          </button>
        </div>
        {rehookResult && <p className="mb-3 text-meta text-cat-commits">{rehookResult}</p>}
        {syncResult && <p className="mb-3 text-meta text-cat-commits">{syncResult}</p>}

        {/* Webhook URL */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-3">
          <span className="text-meta font-medium text-text-tertiary">Webhook URL:</span>
          <code className="flex-1 truncate font-code text-code-block text-text-primary">
            {webhookUrl}
          </code>
          <button
            onClick={copyWebhookUrl}
            className="flex items-center gap-1 rounded px-2 py-1 text-meta text-text-tertiary transition-colors hover:text-brand-primary"
          >
            {copiedUrl ? (
              <><Check size={14} /> 복사됨</>
            ) : (
              <><Copy size={14} /> 복사</>
            )}
          </button>
        </div>

        {/* Setup Guide */}
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="mb-4 flex items-center gap-1 text-meta font-medium text-brand-primary hover:underline"
        >
          <Info size={14} /> Webhook 설정 가이드 {showGuide ? "닫기" : "보기"}
        </button>
        {showGuide && (
          <div className="mb-4 rounded-lg border border-border bg-bg-secondary p-4 text-card-desc text-text-secondary">
            <p className="mb-2 font-semibold text-text-primary">
              GitHub 레포 → Settings → Webhooks → Add webhook
            </p>
            <p>1. <strong>Payload URL:</strong> 위의 Webhook URL을 붙여넣기</p>
            <p>2. <strong>Content type:</strong> application/json</p>
            <p>3. <strong>Secret:</strong> 환경변수 GITHUB_WEBHOOK_SECRET 값과 동일하게 설정</p>
            <p>4. <strong>Events:</strong> &quot;Just the push event&quot; 선택</p>
            <p className="mt-2 text-meta text-text-muted">
              Active 체크 후 Add webhook 클릭하면 완료.
            </p>
          </div>
        )}

        {/* Add Repo Form */}
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={repoOwner}
            onChange={(e) => setRepoOwner(e.target.value)}
            placeholder="owner"
            className="w-28 rounded-lg border border-border bg-bg-primary px-3 py-2 text-card-desc outline-none focus:border-brand-primary"
          />
          <input
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="repo name"
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-card-desc outline-none focus:border-brand-primary"
          />
          <input
            value={repoBranch}
            onChange={(e) => setRepoBranch(e.target.value)}
            placeholder="branch"
            className="w-24 rounded-lg border border-border bg-bg-primary px-3 py-2 text-card-desc outline-none focus:border-brand-primary"
          />
          <label className="flex items-center gap-1.5 text-meta text-text-secondary">
            <input
              type="checkbox"
              checked={repoAutoPublish}
              onChange={(e) => setRepoAutoPublish(e.target.checked)}
              className="rounded"
            />
            자동발행
          </label>
          <button
            onClick={addRepo}
            className="flex items-center gap-1 rounded-lg bg-brand-primary px-4 py-2 text-meta font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus size={14} /> 추가
          </button>
        </div>

        {/* Repo List */}
        <div className="divide-y divide-border-light rounded-lg border border-border">
          {repos.map((repo) => (
            <div key={repo.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-card-desc font-medium">
                    {repo.owner}/{repo.name}
                  </div>
                  <div className="text-meta text-text-muted">
                    {repo.branch} · {repo.autoPublish ? "자동발행" : "수동발행"} ·{" "}
                    {repo.active ? "활성" : "비활성"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingPrompt(editingPrompt === repo.id ? null : repo.id);
                      setPromptValue(repo.promptTemplate || "");
                    }}
                    className="rounded px-2 py-1 text-meta text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                  >
                    프롬프트
                  </button>
                  <button
                    onClick={() => deleteRepo(repo.id)}
                    className="rounded p-1 text-text-muted hover:text-cat-casual"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {editingPrompt === repo.id && (
                <div className="mt-3">
                  <textarea
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    placeholder="이 레포에 대한 추가 AI 프롬프트 지시사항 (선택)"
                    rows={4}
                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 font-code text-code-block outline-none focus:border-brand-primary"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => savePrompt(repo.id)}
                      className="rounded-lg bg-brand-primary px-3 py-1.5 text-meta font-medium text-white hover:opacity-90"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setEditingPrompt(null)}
                      className="rounded-lg border border-border px-3 py-1.5 text-meta text-text-tertiary hover:text-text-primary"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {repos.length === 0 && (
            <div className="px-4 py-6 text-center text-meta text-text-muted">
              등록된 레포가 없습니다.
            </div>
          )}
        </div>
      </Section>
    </div>
  );
};

export default AdminSettingsPage;
