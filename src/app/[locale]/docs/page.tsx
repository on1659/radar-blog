import type { Metadata } from "next";
import { Book, Key, Send, List, Webhook, Lock, Globe } from "lucide-react";

export const metadata: Metadata = { title: "API Docs" };

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/posts",
    auth: true,
    description: "새 글 발행",
    descriptionEn: "Create a new post",
  },
  {
    method: "GET",
    path: "/api/v1/posts",
    auth: false,
    description: "글 목록 조회",
    descriptionEn: "List posts",
  },
  {
    method: "GET",
    path: "/api/v1/posts/:id",
    auth: false,
    description: "글 상세 조회",
    descriptionEn: "Get post by ID",
  },
];

const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-[#00C471]/10 text-[#00C471]",
    POST: "bg-[#3182F6]/10 text-[#3182F6]",
    PUT: "bg-[#FF6B35]/10 text-[#FF6B35]",
    DELETE: "bg-[#EF4444]/10 text-[#EF4444]",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold tracking-wide ${colors[method] || ""}`}>
      {method}
    </span>
  );
};

const DocsPage = () => (
  <>
    {/* Hero */}
    <section className="bg-[#1B1D1F] px-5 sm:px-8 py-16 dark:bg-[#0F1012]">
      <div className="mx-auto max-w-content">
        <div className="mb-4 flex items-center gap-2 text-white/50">
          <Book size={16} />
          <span className="text-meta font-medium tracking-wide uppercase">API Reference</span>
        </div>
        <h1 className="mb-3 text-[2rem] font-[800] leading-tight text-white">
          이더.dev REST API
        </h1>
        <p className="max-w-[520px] text-[0.9375rem] leading-relaxed text-white/60">
          외부에서 블로그 글을 발행하고 조회할 수 있는 REST API.
          Bearer token 인증으로 쓰기 작업을 보호하며, 읽기는 누구나 가능합니다.
        </p>
      </div>
    </section>

    <div className="mx-auto max-w-content px-5 sm:px-8 pb-20 pt-10">
      {/* Base URL */}
      <div className="mb-10 rounded-lg border border-border bg-bg-secondary/50 p-5">
        <div className="mb-2 flex items-center gap-2 text-meta font-semibold text-text-tertiary uppercase">
          <Globe size={14} /> Base URL
        </div>
        <code className="text-[0.9375rem] font-medium text-brand-primary">
          https://radarlog.kr
        </code>
      </div>

      {/* Endpoints Overview */}
      <h2 className="mb-4 text-sub-heading tracking-[-0.01em]">Endpoints</h2>
      <div className="mb-10 divide-y divide-border rounded-lg border border-border">
        {endpoints.map((ep) => (
          <div key={`${ep.method}-${ep.path}`} className="flex items-center gap-4 px-5 py-3.5">
            <MethodBadge method={ep.method} />
            <code className="flex-1 text-[0.875rem] text-text-primary">{ep.path}</code>
            <span className="hidden text-meta text-text-tertiary sm:block">{ep.description}</span>
            {ep.auth && (
              <span className="flex items-center gap-1 text-[0.6875rem] font-medium text-[#FF6B35]">
                <Lock size={11} /> Auth
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Authentication */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <Key size={18} className="text-brand-primary" />
          <h2 className="text-sub-heading tracking-[-0.01em]">인증 (Authentication)</h2>
        </div>
        <p className="mb-4 text-body text-text-secondary">
          쓰기 API(<code className="rounded bg-bg-secondary px-1.5 py-0.5 text-meta font-medium text-brand-primary">POST</code>)는
          API Key 인증이 필요합니다. 관리자 페이지(<code className="rounded bg-bg-secondary px-1.5 py-0.5 text-meta font-medium">/admin/settings</code>)에서 발급받을 수 있습니다.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-bg-secondary/80 px-4 py-2 text-meta font-medium text-text-tertiary">
            Request Header
          </div>
          <pre className="overflow-x-auto bg-[#191A1C] p-4 text-[0.875rem] leading-relaxed text-[#ECECEC]">
            <code>Authorization: Bearer YOUR_API_KEY</code>
          </pre>
        </div>
      </section>

      {/* POST /api/v1/posts */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <Send size={18} className="text-[#3182F6]" />
          <h2 className="text-sub-heading tracking-[-0.01em]">글 발행</h2>
          <MethodBadge method="POST" />
          <code className="text-meta text-text-tertiary">/api/v1/posts</code>
        </div>

        <h3 className="mb-2 text-[0.9375rem] font-semibold">Request Body</h3>
        <div className="mb-6 overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-bg-secondary/80 px-4 py-2 text-meta font-medium text-text-tertiary">
            application/json
          </div>
          <pre className="overflow-x-auto bg-[#191A1C] p-4 text-[0.875rem] leading-[1.7] text-[#ECECEC]">
            <code>{`{
  "title": "글 제목",
  "content": "마크다운 본문",
  "category": "articles",
  "tags": ["태그1", "태그2"],
  "published": true
}`}</code>
          </pre>
        </div>

        <h3 className="mb-2 text-[0.9375rem] font-semibold">필수 필드</h3>
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-[0.875rem]">
            <thead>
              <tr className="border-b border-border text-left text-meta font-semibold text-text-tertiary">
                <th className="pb-2 pr-6">Field</th>
                <th className="pb-2 pr-6">Type</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border/50">
                <td className="py-2.5 pr-6"><code className="font-medium text-text-primary">title</code></td>
                <td className="py-2.5 pr-6 text-meta text-text-tertiary">string</td>
                <td className="py-2.5">글 제목</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2.5 pr-6"><code className="font-medium text-text-primary">content</code></td>
                <td className="py-2.5 pr-6 text-meta text-text-tertiary">string</td>
                <td className="py-2.5">마크다운 본문</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2.5 pr-6"><code className="font-medium text-text-primary">category</code></td>
                <td className="py-2.5 pr-6 text-meta text-text-tertiary">string</td>
                <td className="py-2.5">
                  <code className="rounded bg-bg-secondary px-1 py-0.5 text-[0.75rem]">commits</code>{" "}
                  <code className="rounded bg-bg-secondary px-1 py-0.5 text-[0.75rem]">articles</code>{" "}
                  <code className="rounded bg-bg-secondary px-1 py-0.5 text-[0.75rem]">casual</code>{" "}
                  <code className="rounded bg-bg-secondary px-1 py-0.5 text-[0.75rem]">signal</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 text-[0.9375rem] font-semibold">선택 필드</h3>
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-[0.875rem]">
            <thead>
              <tr className="border-b border-border text-left text-meta font-semibold text-text-tertiary">
                <th className="pb-2 pr-6">Field</th>
                <th className="pb-2 pr-6">Type</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {[
                ["slug", "string", "URL 슬러그 (미지정 시 제목에서 자동 생성)"],
                ["subtitle", "string", "부제목"],
                ["excerpt", "string", "요약문 (미지정 시 본문 앞 200자)"],
                ["coverImage", "string", "커버 이미지 URL"],
                ["published", "boolean", "발행 여부 (기본 false)"],
                ["tags", "string[]", "태그 배열"],
                ["repoName", "string", "GitHub 레포 이름"],
                ["commitHash", "string", "커밋 해시"],
                ["commitUrl", "string", "커밋 URL"],
                ["filesChanged", "number", "변경된 파일 수"],
              ].map(([field, type, desc]) => (
                <tr key={field} className="border-b border-border/50">
                  <td className="py-2.5 pr-6"><code className="font-medium text-text-primary">{field}</code></td>
                  <td className="py-2.5 pr-6 text-meta text-text-tertiary">{type}</td>
                  <td className="py-2.5">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Response */}
        <h3 className="mb-2 text-[0.9375rem] font-semibold">Response</h3>
        <div className="mb-4 overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-bg-secondary/80 px-4 py-2 text-meta font-medium">
            <span className="text-[#00C471]">201</span>
            <span className="text-text-tertiary">Created</span>
          </div>
          <pre className="overflow-x-auto bg-[#191A1C] p-4 text-[0.875rem] leading-[1.7] text-[#ECECEC]">
            <code>{`{
  "success": true,
  "data": {
    "id": "clxxx...",
    "slug": "글-제목",
    "title": "글 제목",
    "published": true,
    "createdAt": "2026-03-10T..."
  }
}`}</code>
          </pre>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-bg-secondary/80 px-4 py-2 text-meta font-medium">
            <span className="text-[#EF4444]">401</span>
            <span className="text-text-tertiary">Unauthorized</span>
          </div>
          <pre className="overflow-x-auto bg-[#191A1C] p-4 text-[0.875rem] leading-[1.7] text-[#ECECEC]">
            <code>{`{
  "success": false,
  "error": "Invalid API key"
}`}</code>
          </pre>
        </div>
      </section>

      {/* GET /api/v1/posts */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <List size={18} className="text-[#00C471]" />
          <h2 className="text-sub-heading tracking-[-0.01em]">글 목록 조회</h2>
          <MethodBadge method="GET" />
          <code className="text-meta text-text-tertiary">/api/v1/posts</code>
        </div>
        <p className="mb-4 text-body text-text-secondary">
          인증 없이 누구나 조회 가능합니다.
        </p>

        <h3 className="mb-2 text-[0.9375rem] font-semibold">Query Parameters</h3>
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-[0.875rem]">
            <thead>
              <tr className="border-b border-border text-left text-meta font-semibold text-text-tertiary">
                <th className="pb-2 pr-6">Parameter</th>
                <th className="pb-2 pr-6">Type</th>
                <th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {[
                ["category", "string", "카테고리 필터"],
                ["tag", "string", "태그 필터"],
                ["published", "boolean", "발행 상태 필터"],
                ["page", "number", "페이지 번호 (기본 1)"],
                ["limit", "number", "페이지당 개수 (기본 20, 최대 100)"],
              ].map(([param, type, desc]) => (
                <tr key={param} className="border-b border-border/50">
                  <td className="py-2.5 pr-6"><code className="font-medium text-text-primary">{param}</code></td>
                  <td className="py-2.5 pr-6 text-meta text-text-tertiary">{type}</td>
                  <td className="py-2.5">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 text-[0.9375rem] font-semibold">Response</h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-bg-secondary/80 px-4 py-2 text-meta font-medium">
            <span className="text-[#00C471]">200</span>
            <span className="text-text-tertiary">OK</span>
          </div>
          <pre className="overflow-x-auto bg-[#191A1C] p-4 text-[0.875rem] leading-[1.7] text-[#ECECEC]">
            <code>{`{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}`}</code>
          </pre>
        </div>
      </section>

      {/* curl example */}
      <section className="mb-12">
        <h2 className="mb-4 text-sub-heading tracking-[-0.01em]">curl 예시</h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-bg-secondary/80 px-4 py-2 text-meta font-medium text-text-tertiary">
            Terminal
          </div>
          <pre className="overflow-x-auto bg-[#191A1C] p-4 text-[0.875rem] leading-[1.7] text-[#ECECEC]">
            <code>{`curl -X POST https://radarlog.kr/api/v1/posts \\
  -H "Authorization: Bearer sk-abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "테스트 글",
    "content": "## 제목\\n본문 내용입니다.",
    "category": "articles",
    "tags": ["test"],
    "published": true
  }'`}</code>
          </pre>
        </div>
      </section>

      {/* Webhook */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <Webhook size={18} className="text-[#8B5CF6]" />
          <h2 className="text-sub-heading tracking-[-0.01em]">GitHub Webhook</h2>
        </div>
        <p className="mb-4 text-body text-text-secondary">
          API를 직접 호출하지 않아도, GitHub 레포에 push하면 AI가 자동으로 블로그 글을 생성합니다.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-bg-secondary/80 px-4 py-2 text-meta font-medium text-text-tertiary">
            Setup
          </div>
          <div className="bg-[#191A1C] p-4 text-[0.875rem] leading-[1.8] text-[#ECECEC]">
            <div className="space-y-1">
              <p><span className="text-[#8B5CF6]">1.</span> <code>/admin/settings</code>에서 GitHub 레포 등록</p>
              <p><span className="text-[#8B5CF6]">2.</span> GitHub 레포 → Settings → Webhooks → Add webhook</p>
              <p><span className="text-[#8B5CF6]">3.</span> Payload URL: <code className="text-[#60A5FA]">https://radarlog.kr/api/webhooks/github</code></p>
              <p><span className="text-[#8B5CF6]">4.</span> Content type: <code>application/json</code></p>
              <p><span className="text-[#8B5CF6]">5.</span> Secret: <code>GITHUB_WEBHOOK_SECRET</code> 값과 동일하게</p>
              <p><span className="text-[#8B5CF6]">6.</span> Events: <code>Just the push event</code></p>
            </div>
          </div>
        </div>
      </section>

      {/* Rate Limiting / Notes */}
      <section>
        <h2 className="mb-4 text-sub-heading tracking-[-0.01em]">참고</h2>
        <ul className="list-inside list-disc space-y-2 text-body text-text-secondary">
          <li>읽기(GET)는 인증 없이 누구나 호출 가능합니다.</li>
          <li>쓰기(POST)는 반드시 API Key가 필요합니다.</li>
          <li>API Key는 관리자 페이지에서만 발급 가능하며, 발급 후 다시 확인할 수 없습니다.</li>
          <li>응답 형식: <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-meta">{`{ success, data?, error? }`}</code></li>
        </ul>
      </section>
    </div>
  </>
);

export default DocsPage;
