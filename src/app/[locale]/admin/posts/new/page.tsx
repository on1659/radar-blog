"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, Eye, EyeOff, Code, FileText } from "lucide-react";

const CATEGORIES = ["commits", "articles", "techlab", "casual"] as const;

const NewPostPage = () => {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("articles");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(true);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const handleMdUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // Try to extract title from first # heading
      const titleMatch = text.match(/^#\s+(.+)$/m);
      if (titleMatch && !title) setTitle(titleMatch[1]);
      setContent(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.name.endsWith(".md")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const titleMatch = text.match(/^#\s+(.+)$/m);
      if (titleMatch && !title) setTitle(titleMatch[1]);
      setContent(text);
    };
    reader.readAsText(file);
  }, [title]);

  const insertArtifact = () => {
    const artifact = `\n\`\`\`html:artifact\n<div style="padding: 24px; font-family: sans-serif;">\n  <h2>Interactive Demo</h2>\n  <p>여기에 HTML/CSS/JS 코드를 작성하세요</p>\n</div>\n\`\`\`\n`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const before = content.slice(0, start);
      const after = content.slice(start);
      setContent(before + artifact + after);
    } else {
      setContent(content + artifact);
    }
  };

  const fetchPreview = async () => {
    if (!preview) {
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
    }
    setPreview(!preview);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          category,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
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

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-section-title">글 작성</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-meta font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
          >
            <Upload size={13} />
            MD 파일 업로드
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.mdx"
            onChange={handleMdUpload}
            className="hidden"
          />
          <button
            onClick={insertArtifact}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-meta font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
          >
            <Code size={13} />
            목업 삽입
          </button>
          <button
            onClick={fetchPreview}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-meta font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
          >
            {preview ? <EyeOff size={13} /> : <Eye size={13} />}
            {preview ? "편집" : "미리보기"}
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력하세요"
        className="mb-4 w-full border-b-2 border-border bg-transparent pb-3 text-2xl font-bold text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primary"
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

      {/* Content area */}
      <div
        className="min-h-[500px] rounded-xl border border-border"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="p-6">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        ) : (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="마크다운으로 작성하세요... (.md 파일을 드래그 앤 드롭할 수도 있습니다)"
              className="h-[500px] w-full resize-y rounded-xl bg-transparent p-6 font-code text-[14px] leading-[1.7] text-text-primary outline-none placeholder:text-text-muted"
            />
            {!content && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 text-text-muted">
                <FileText size={40} strokeWidth={1} />
                <span className="text-sm">.md 파일을 여기에 드롭하세요</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-meta text-text-muted">
          {content.length > 0 && `${content.length}자 · 약 ${Math.max(1, Math.ceil(content.replace(/\s/g, "").length / 400))}분 읽기`}
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
            {saving ? "저장 중..." : published ? "발행하기" : "임시저장"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewPostPage;
