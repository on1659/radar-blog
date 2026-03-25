import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { ApiResponse } from "@/types";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

const requireAdmin = async () => {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  return session && user?.isAdmin;
};

export const POST = async (req: NextRequest) => {
  if (!(await requireAdmin())) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { content, contentType } = await req.json();

    if (!content) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "content is required" },
        { status: 400 }
      );
    }

    // HTML content: return as-is (render in iframe on client)
    if (contentType === "html") {
      return NextResponse.json<ApiResponse>({ success: true, data: content });
    }

    // Pre-process artifact blocks into iframes for preview
    const processed = content.replace(
      /```html:artifact\n([\s\S]*?)```/g,
      (_match: string, code: string) => {
        const escaped = code.trim().replace(/"/g, "&quot;");
        return `<div style="border:1px solid #333538;border-radius:12px;overflow:hidden;margin:16px 0">
<div style="padding:8px 12px;background:#2B2D31;font-size:12px;color:#6B7684;font-weight:500;display:flex;align-items:center;gap:6px">Interactive Artifact</div>
<iframe srcdoc="<!DOCTYPE html><html><head><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:sans-serif;background:#212325;color:#ECECEC}</style></head><body>${escaped}</body></html>" sandbox="allow-scripts" style="width:100%;min-height:150px;border:0;background:#212325"></iframe>
</div>`;
      }
    );

    const result = await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .process(processed);

    return NextResponse.json<ApiResponse>({ success: true, data: String(result) });
  } catch (error) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: error instanceof Error ? error.message : "Failed to render preview" },
      { status: 500 }
    );
  }
};
