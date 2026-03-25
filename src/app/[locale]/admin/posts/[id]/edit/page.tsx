"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Upload, Code, FileText, Globe, ArrowLeft, Columns2, Eye, PenLine, FileCode2 } from "lucide-react";

const CATEGORIES = ["commits", "articles", "casual", "signal"] as const;

interface Frontmatter {
  title?: string;
  subtitle?: string;
  slug?: string;
  tags?: string;
}

const parseFrontmatter = (text: string): { frontmatter: Frontmatter; content: string } => {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, content: text };

  const raw = match[1];
  const content = match[2].trim();
  const frontmatter: Frontmatter = {};

  for (const line of raw.split("\n")) {
    const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    const v = value.trim();
    if (key === "title") frontmatter.title = v;
    else if (key === "subtitle") frontmatter.subtitle = v;
    else if (key === "slug") frontmatter.slug = v;
    else if (key === "tags") frontmatter.tags = v;
  }

  return { frontmatter, content };
};

const EditPostPage = () => {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const koFileRef = useRef<HTMLInputElement>(null);
  const enFileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<string>("articles");
  const [tags, setTags] = useState("");
  const [contentKo, setContentKo] = useState("");
  const [contentEn, setContentEn] = useState("");
  const [published, setPublished] = useState(true);
  const [viewMode, setViewMode] = useState<"edit" | "split" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [contentType, setContentType] = useState<"markdown" | "html">("markdown");
  const [activeLang, setActiveLang] = useState<"ko" | "en">("ko");
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const htmlFileRef = useRef<HTMLInputElement>(null);

  const activeContent = activeLang === "ko" ? contentKo : contentEn;
  const setActiveContent = activeLang === "ko" ? setContentKo : setContentEn;

  // Fetch existing post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/admin/posts/${postId}`);
        const data = await res.json();
        if (data.success) {
          const post = data.data;
          setTitle(post.title || "");
          setSubtitle(post.subtitle || "");
          setSlug(post.slug || "");
          setCategory(post.category || "articles");
          setTags((post.tags || []).join(", "));
          setContentKo(post.content || "");
          setContentEn(post.contentEn || "");
          setContentType(post.contentType || "markdown");
          setPublished(post.published ?? true);
        } else {
          alert("글을 불러올 수 없습니다.");
          router.push("/admin/posts");
        }
      } catch {
        alert("글을 불러올 수 없습니다.");
        router.push("/admin/posts");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId, router]);

  const applyFrontmatter = useCallback(
    (fm: Frontmatter) => {
      if (fm.title) setTitle(fm.title);
      if (fm.subtitle) setSubtitle(fm.subtitle);
      if (fm.slug) setSlug(fm.slug);
      if (fm.tags) setTags(fm.tags);
    },
    []
  );

  const handleMdUpload = useCallback(
    (lang: "ko" | "en") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const { frontmatter, content } = parseFrontmatter(text);
        applyFrontmatter(frontmatter);
        if (lang === "ko") {
          setContentKo(content);
          setActiveLang("ko");
        } else {
          setContentEn(content);
          setActiveLang("en");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [applyFrontmatter]
  );

  const handleHtmlUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (activeLang === "en") {
          setContentEn(text);
        } else {
          setContentKo(text);
        }
        setContentType("html");
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [activeLang]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const isHtml = /\.html?$/i.test(file.name);
      const isMd = /\.mdx?$|\.markdown$/i.test(file.name);
      if (!isHtml && !isMd) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (isHtml) {
          setContentKo(text);
          setContentType("html");
          setActiveLang("ko");
        } else {
          const { frontmatter, content } = parseFrontmatter(text);
          applyFrontmatter(frontmatter);
          setContentType("markdown");
          const isEn = /[-_.]en\.md$/i.test(file.name);
          if (isEn) {
            setContentEn(content);
            setActiveLang("en");
          } else {
            setContentKo(content);
            setActiveLang("ko");
          }
        }
      };
      reader.readAsText(file);
    },
    [applyFrontmatter]
  );

  const insertArtifact = () => {
    const artifact = `\n\`\`\`html:artifact\n<div style="padding: 24px; font-family: sans-serif;">\n  <h2>Interactive Demo</h2>\n  <p>여기에 HTML/CSS/JS 코드를 작성하세요</p>\n</div>\n\`\`\`\n`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const before = activeContent.slice(0, start);
      const after = activeContent.slice(start);
      setActiveContent(before + artifact + after);
    } else {
      setActiveContent(activeContent + artifact);
    }
  };

  const refreshPreview = useCallback(async (content: string) => {
    try {
      const res = await fetch("/api/admin/posts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.success) setPreviewHtml(data.data);
    } catch {
      setPreviewHtml("<p>미리보기 로드 실패</p>");
    }
  }, []);

  // Auto-refresh preview in split/preview mode with debounce
  useEffect(() => {
    if (viewMode === "edit") return;
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      refreshPreview(activeContent);
    }, 600);
    return () => { if (previewTimer.current) clearTimeout(previewTimer.current); };
  }, [activeContent, viewMode, refreshPreview]);

  const handleSave = async () => {
    if (!title.trim() || !contentKo.trim()) {
      alert("제목과 한국어 내용을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          content: contentKo,
          contentType,
          contentEn: contentEn.trim() || null,
          titleEn: contentEn.trim() ? title.trim() : null,
          category,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          published,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/admin/posts");
      } else {
        alert("저장 실패: " + data.error);
      }
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[900px] py-20 text-center text-text-muted">
        로딩 중...
      </div>
    );
  }

  return (
    <div className={`mx-auto ${viewMode === "split" ? "max-w-[1400px]" : "max-w-[900px]"} transition-all duration-300`}>
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/posts")}
            className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-section-title">글 수정</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => koFileRef.current?.click()}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-meta font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
          >
            <Upload size={13} />
            KO 업로드
          </button>
          <input
            ref={koFileRef}
            type="file"
            accept=".md,.markdown,.mdx"
            onChange={handleMdUpload("ko")}
            className="hidden"
          />
          <button
            onClick={() => enFileRef.current?.click()}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-meta font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
          >
            <Globe size={13} />
            EN 업로드
          </button>
          <input
            ref={enFileRef}
            type="file"
            accept=".md,.markdown,.mdx"
            onChange={handleMdUpload("en")}
            className="hidden"
          />
          <button
            onClick={() => htmlFileRef.current?.click()}
            className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-meta font-medium transition-colors ${
              contentType === "html"
                ? "border-cat-signal bg-cat-signal/10 text-cat-signal"
                : "border-border text-text-secondary hover:bg-bg-secondary"
            }`}
          >
            <FileCode2 size={13} />
            HTML
          </button>
          <input
            ref={htmlFileRef}
            type="file"
            accept=".html,.htm"
            onChange={handleHtmlUpload}
            className="hidden"
          />
          <button
            onClick={insertArtifact}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-meta font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
          >
            <Code size={13} />
            목업 삽입
          </button>
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              onClick={() => setViewMode("edit")}
              className={`flex items-center gap-1 px-3 py-1.5 text-meta font-medium transition-colors ${
                viewMode === "edit" ? "bg-text-primary text-bg-primary" : "text-text-tertiary hover:bg-bg-secondary"
              }`}
            >
              <PenLine size={13} />
              편집
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`flex items-center gap-1 border-x border-border px-3 py-1.5 text-meta font-medium transition-colors ${
                viewMode === "split" ? "bg-text-primary text-bg-primary" : "text-text-tertiary hover:bg-bg-secondary"
              }`}
            >
              <Columns2 size={13} />
              분할
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1 px-3 py-1.5 text-meta font-medium transition-colors ${
                viewMode === "preview" ? "bg-text-primary text-bg-primary" : "text-text-tertiary hover:bg-bg-secondary"
              }`}
            >
              <Eye size={13} />
              미리보기
            </button>
          </div>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력하세요"
        className="mb-2 w-full border-b-2 border-border bg-transparent pb-3 text-2xl font-bold text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primary"
      />

      {/* Subtitle */}
      <input
        type="text"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        placeholder="부제를 입력하세요 (선택)"
        className="mb-4 w-full border-b border-border bg-transparent pb-2 text-lg text-text-secondary outline-none placeholder:text-text-muted focus:border-brand-primary"
      />

      {/* Meta row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full border px-3 py-1 text-meta font-medium transition-all ${
                category === cat
                  ? "border-text-primary bg-text-primary text-bg-primary"
                  : "border-border text-text-tertiary hover:border-text-tertiary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="태그 (콤마로 구분)"
          className="flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-meta text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primary"
        />
        <label className="flex cursor-pointer items-center gap-1.5 text-meta text-text-tertiary">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="h-4 w-4 accent-brand-primary"
          />
          바로 발행
        </label>
      </div>

      {/* Slug (read-only for edit) */}
      <div className="mb-4">
        <input
          type="text"
          value={slug}
          disabled
          className="w-full rounded-lg border border-border bg-bg-tertiary px-3 py-1.5 text-meta text-text-muted outline-none"
        />
      </div>

      {/* Language tabs */}
      <div className="mb-0 flex items-center border-b border-border">
        <button
          onClick={() => { setActiveLang("ko"); }}
          className={`px-5 py-2.5 text-meta font-medium transition-all ${
            activeLang === "ko"
              ? "border-b-2 border-brand-primary text-brand-primary"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          한국어 (KO)
          {contentKo && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-cat-commits" />}
        </button>
        <button
          onClick={() => { setActiveLang("en"); }}
          className={`px-5 py-2.5 text-meta font-medium transition-all ${
            activeLang === "en"
              ? "border-b-2 border-brand-primary text-brand-primary"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          English (EN)
          {contentEn && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-cat-commits" />}
        </button>
        {contentType === "html" && (
          <span className="ml-auto mr-2 rounded-full bg-cat-signal/10 px-2.5 py-0.5 text-xs font-semibold text-cat-signal">
            HTML
          </span>
        )}
      </div>

      {/* Content area */}
      <div
        className={`min-h-[500px] rounded-b-xl border border-t-0 border-border ${viewMode === "split" ? "flex" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* Editor pane */}
        {viewMode !== "preview" && (
          <div className={`relative ${viewMode === "split" ? "w-1/2 border-r border-border" : "w-full"}`}>
            <textarea
              ref={textareaRef}
              value={activeContent}
              onChange={(e) => setActiveContent(e.target.value)}
              placeholder={
                activeLang === "ko"
                  ? "마크다운 또는 HTML로 작성하세요... (.md/.html 파일을 드래그 앤 드롭할 수도 있습니다)"
                  : "Write in markdown or HTML... (drag & drop .md/.html files)"
              }
              className={`h-[500px] w-full resize-y bg-transparent p-6 font-code text-[14px] leading-[1.7] text-text-primary outline-none placeholder:text-text-muted ${viewMode === "edit" ? "rounded-b-xl" : ""}`}
            />
            {!activeContent && viewMode === "edit" && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-text-muted">
                <FileText size={40} strokeWidth={1} />
                <span className="text-sm">
                  {activeLang === "ko"
                    ? ".md 또는 .html 파일을 여기에 드롭하세요"
                    : "Drop .md or .html file here"}
                </span>
              </div>
            )}
          </div>
        )}
        {/* Preview pane */}
        {viewMode !== "edit" && (
          <div className={`overflow-y-auto p-6 ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-meta text-text-muted">
          {activeContent.length > 0 &&
            `${activeContent.length}자 · 약 ${Math.max(1, Math.ceil(activeContent.replace(/\s/g, "").length / 400))}분 읽기`}
          {contentKo && contentEn && (
            <span className="ml-2 text-cat-commits">KO + EN</span>
          )}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/admin/posts")}
            className="rounded-lg bg-bg-secondary px-5 py-2 text-sm text-text-tertiary transition-colors hover:text-text-primary"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-brand-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "수정 저장"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPostPage;
