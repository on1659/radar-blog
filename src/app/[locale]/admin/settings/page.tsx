"use client";

import { useEffect, useState } from "react";
import { Key, Plus, Trash2, GitBranch, Copy, Check, Info, RefreshCw, Webhook } from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  lastUsed: string | null;
}

interface RepoItem {
  id: string;
  owner: string;
  name: string;
  branch: string;
  active: boolean;
  autoPublish: boolean;
  promptTemplate: string | null;
}

const AdminSettingsPage = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [repoOwner, setRepoOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [repoBranch, setRepoBranch] = useState("main");
  const [repoAutoPublish, setRepoAutoPublish] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [rehooking, setRehooking] = useState(false);
  const [rehookResult, setRehookResult] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>("");

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/github`
    : "/api/webhooks/github";

  const fetchData = async () => {
    try {
      const [keysRes, reposRes] = await Promise.all([
        fetch("/api/admin/api-keys"),
        fetch("/api/admin/repos"),
      ]);
      const keysData = await keysRes.json();
      const reposData = await reposRes.json();
      if (keysData.success) setApiKeys(keysData.data);
      if (reposData.success) setRepos(reposData.data);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchData(); }, []);

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedKey(data.data.key);
        setNewKeyName("");
        fetchData();
      }
    } catch { alert("API Key 생성에 실패했습니다."); }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm("비활성화하시겠습니까?")) return;
    await fetch("/api/admin/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  const addRepo = async () => {
    if (!repoOwner.trim() || !repoName.trim()) return;
    try {
      const res = await fetch("/api/admin/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: repoOwner, name: repoName, branch: repoBranch, autoPublish: repoAutoPublish }),
      });
      const data = await res.json();
      if (data.success) {
        setRepoOwner(""); setRepoName(""); setRepoBranch("main"); setRepoAutoPublish(false);
        fetchData();
      }
    } catch { alert("레포 추가에 실패했습니다."); }
  };

  const deleteRepo = async (id: string) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/admin/repos/${id}`, { method: "DELETE" });
    fetchData();
  };

  const savePrompt = async (id: string) => {
    await fetch(`/api/admin/repos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptTemplate: promptValue || null }),
    });
    setEditingPrompt(null);
    fetchData();
  };

  const rehook = async () => {
    setRehooking(true);
    setRehookResult("");
    try {
      const res = await fetch("/api/admin/repos/rehook", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setRehookResult(`완료: ${data.data.ok}/${data.data.total}개 webhook 설치`);
        fetchData();
      } else {
        setRehookResult(`실패: ${data.error}`);
      }
    } catch { setRehookResult("오류가 발생했습니다."); }
    finally { setRehooking(false); }
  };

  const syncRepos = async () => {
    setSyncing(true);
    setSyncResult("");
    try {
      const res = await fetch("/api/admin/repos/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const { newCount, added } = data.data;
        setSyncResult(newCount > 0 ? `${newCount}개 추가됨: ${added.join(", ")}` : "새 레포 없음");
        fetchData();
      } else {
        setSyncResult(`실패: ${data.error}`);
      }
    } catch { setSyncResult("오류가 발생했습니다."); }
    finally { setSyncing(false); }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-12">
      <h1 className="text-section-title">설정</h1>

      {/* API Keys */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sub-heading">
          <Key size={18} /> API Key 관리
        </h2>
        <div className="mb-4 flex gap-2">
          <input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="API Key 이름" onKeyDown={(e) => e.key === "Enter" && createApiKey()}
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-card-desc outline-none focus:border-brand-primary" />
          <button onClick={createApiKey}
            className="flex items-center gap-1 rounded-lg bg-brand-primary px-4 py-2 text-meta font-medium text-white transition-opacity hover:opacity-90">
            <Plus size={14} /> 발급
          </button>
        </div>
        {generatedKey && (
          <div className="mb-4 rounded-lg border border-cat-commits bg-[rgba(0,196,113,0.08)] p-3">
            <p className="mb-1 text-meta font-medium text-cat-commits">
              API Key가 생성되었습니다. 이 키는 다시 표시되지 않습니다:
            </p>
            <code className="block break-all font-code text-code-block text-text-primary">{generatedKey}</code>
          </div>
        )}
        <div className="divide-y divide-border-light rounded-xl border border-border">
          {apiKeys.map((key) => (
            <div key={key.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-card-desc font-medium">{key.name}</div>
                <div className="text-meta text-text-muted">
                  {key.active ? "활성" : "비활성"} · {new Date(key.createdAt).toLocaleDateString("ko-KR")}
                  {key.lastUsed && ` · 마지막 사용: ${new Date(key.lastUsed).toLocaleDateString("ko-KR")}`}
                </div>
              </div>
              <button onClick={() => deleteApiKey(key.id)} className="rounded p-1 text-text-muted hover:text-cat-casual">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {apiKeys.length === 0 && (
            <div className="px-4 py-6 text-center text-meta text-text-muted">등록된 API Key가 없습니다.</div>
          )}
        </div>
      </section>

      {/* Watched Repos */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sub-heading">
          <GitBranch size={18} /> GitHub 감시 레포
        </h2>

        {/* 액션 버튼 */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={rehook} disabled={rehooking}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-meta font-medium text-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-50">
            <Webhook size={14} className={rehooking ? "animate-spin" : ""} />
            {rehooking ? "설치 중..." : "Webhook 재설치"}
          </button>
          <button onClick={syncRepos} disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-meta font-medium text-text-secondary transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-50">
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "동기화 중..." : "레포 동기화"}
          </button>
        </div>
        {rehookResult && (
          <p className="mb-3 text-meta text-cat-commits">{rehookResult}</p>
        )}
        {syncResult && (
          <p className="mb-3 text-meta text-cat-commits">{syncResult}</p>
        )}

        {/* Webhook URL */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-3">
          <span className="text-meta font-medium text-text-tertiary">Webhook URL:</span>
          <code className="flex-1 truncate font-code text-code-block text-text-primary">{webhookUrl}</code>
          <button onClick={copyWebhookUrl}
            className="flex items-center gap-1 rounded px-2 py-1 text-meta text-text-tertiary transition-colors hover:text-brand-primary">
            {copiedUrl ? <><Check size={14} /> 복사됨</> : <><Copy size={14} /> 복사</>}
          </button>
        </div>

        {/* Setup Guide */}
        <button onClick={() => setShowGuide(!showGuide)}
          className="mb-4 flex items-center gap-1 text-meta font-medium text-brand-primary hover:underline">
          <Info size={14} /> Webhook 설정 가이드 {showGuide ? "닫기" : "보기"}
        </button>
        {showGuide && (
          <div className="mb-4 rounded-lg border border-border bg-bg-secondary p-4 text-card-desc text-text-secondary">
            <p className="mb-2 font-semibold text-text-primary">GitHub 레포 → Settings → Webhooks → Add webhook</p>
            <p>1. <strong>Payload URL:</strong> 위의 Webhook URL을 붙여넣기</p>
            <p>2. <strong>Content type:</strong> application/json</p>
            <p>3. <strong>Secret:</strong> 환경변수 GITHUB_WEBHOOK_SECRET 값과 동일하게 설정</p>
            <p>4. <strong>Events:</strong> &quot;Just the push event&quot; 선택</p>
            <p className="mt-2 text-meta text-text-muted">Active 체크 후 Add webhook 클릭하면 완료.</p>
          </div>
        )}

        {/* Add Repo Form */}
        <div className="mb-4 flex flex-wrap gap-2">
          <input value={repoOwner} onChange={(e) => setRepoOwner(e.target.value)}
            placeholder="owner" className="w-28 rounded-lg border border-border bg-bg-primary px-3 py-2 text-card-desc outline-none focus:border-brand-primary" />
          <input value={repoName} onChange={(e) => setRepoName(e.target.value)}
            placeholder="repo name" className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-card-desc outline-none focus:border-brand-primary" />
          <input value={repoBranch} onChange={(e) => setRepoBranch(e.target.value)}
            placeholder="branch" className="w-24 rounded-lg border border-border bg-bg-primary px-3 py-2 text-card-desc outline-none focus:border-brand-primary" />
          <label className="flex items-center gap-1.5 text-meta text-text-secondary">
            <input type="checkbox" checked={repoAutoPublish} onChange={(e) => setRepoAutoPublish(e.target.checked)}
              className="rounded" />
            자동발행
          </label>
          <button onClick={addRepo}
            className="flex items-center gap-1 rounded-lg bg-brand-primary px-4 py-2 text-meta font-medium text-white transition-opacity hover:opacity-90">
            <Plus size={14} /> 추가
          </button>
        </div>

        {/* Repo List */}
        <div className="divide-y divide-border-light rounded-xl border border-border">
          {repos.map((repo) => (
            <div key={repo.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-card-desc font-medium">{repo.owner}/{repo.name}</div>
                  <div className="text-meta text-text-muted">
                    {repo.branch} · {repo.autoPublish ? "자동발행" : "수동발행"} · {repo.active ? "활성" : "비활성"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingPrompt(editingPrompt === repo.id ? null : repo.id); setPromptValue(repo.promptTemplate || ""); }}
                    className="rounded px-2 py-1 text-meta text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary">
                    프롬프트
                  </button>
                  <button onClick={() => deleteRepo(repo.id)} className="rounded p-1 text-text-muted hover:text-cat-casual">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {editingPrompt === repo.id && (
                <div className="mt-3">
                  <textarea value={promptValue} onChange={(e) => setPromptValue(e.target.value)}
                    placeholder="이 레포에 대한 추가 AI 프롬프트 지시사항 (선택)"
                    rows={4}
                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 font-code text-code-block outline-none focus:border-brand-primary" />
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => savePrompt(repo.id)}
                      className="rounded-lg bg-brand-primary px-3 py-1.5 text-meta font-medium text-white hover:opacity-90">저장</button>
                    <button onClick={() => setEditingPrompt(null)}
                      className="rounded-lg border border-border px-3 py-1.5 text-meta text-text-tertiary hover:text-text-primary">취소</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {repos.length === 0 && (
            <div className="px-4 py-6 text-center text-meta text-text-muted">등록된 레포가 없습니다.</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminSettingsPage;
