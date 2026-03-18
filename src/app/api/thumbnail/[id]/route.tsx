import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

const categoryStyles: Record<string, { bg: string; accent: string }> = {
  commits: { bg: "#0A2E1F", accent: "#00C471" },
  articles: { bg: "#0F1F3D", accent: "#3182F6" },
  casual: { bg: "#2E1508", accent: "#FF6B35" },
  signal: { bg: "#0B2E34", accent: "#06B6D4" },
};

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    select: { title: true, category: true, tags: true },
  });

  if (!post) {
    return new Response(null, { status: 404 });
  }

  const style = categoryStyles[post.category] || categoryStyles.articles;
  const title = post.title.length > 40 ? post.title.slice(0, 38) + "…" : post.title;
  const tags = post.tags.slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "28px",
          background: `linear-gradient(135deg, ${style.bg} 0%, ${style.accent}22 100%)`,
          fontFamily: "sans-serif",
        }}
      >
        {/* Category dot */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: style.accent,
            }}
          />
          <span style={{ color: style.accent, fontSize: "13px", fontWeight: 600 }}>
            {post.category}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            color: "#ECECEC",
            fontSize: "22px",
            fontWeight: 800,
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  color: `${style.accent}CC`,
                  fontSize: "11px",
                  fontWeight: 500,
                  background: `${style.accent}18`,
                  padding: "3px 8px",
                  borderRadius: "4px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    ),
    {
      width: 400,
      height: 260,
      headers: {
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
      },
    }
  );
};
