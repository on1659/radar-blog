import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

const requireAdmin = async () => {
  const session = await auth();
  const user = session?.user as { isAdmin?: boolean } | undefined;
  return session && user?.isAdmin;
};

const ENV_KEYS = [
  { key: "DATABASE_URL", label: "Database URL", group: "core" },
  { key: "NEXTAUTH_SECRET", label: "NextAuth Secret", group: "core" },
  { key: "NEXTAUTH_URL", label: "NextAuth URL", group: "core" },
  { key: "ANTHROPIC_API_KEY", label: "Anthropic API Key (Claude)", group: "ai" },
  { key: "GITHUB_TOKEN", label: "GitHub Token", group: "github" },
  { key: "GITHUB_WEBHOOK_SECRET", label: "GitHub Webhook Secret", group: "github" },
  { key: "GITHUB_CLIENT_ID", label: "GitHub OAuth Client ID", group: "github" },
  { key: "GITHUB_CLIENT_SECRET", label: "GitHub OAuth Client Secret", group: "github" },
  { key: "ADMIN_ID", label: "Admin ID", group: "admin" },
  { key: "ADMIN_PASSWORD", label: "Admin Password", group: "admin" },
  { key: "ADMIN_GITHUB_ID", label: "Admin GitHub ID", group: "admin" },
  { key: "NEXT_PUBLIC_UMAMI_URL", label: "Umami URL", group: "analytics" },
  { key: "NEXT_PUBLIC_UMAMI_WEBSITE_ID", label: "Umami Website ID", group: "analytics" },
] as const;

export const GET = async () => {
  if (!(await requireAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const status = ENV_KEYS.map(({ key, label, group }) => ({
    key,
    label,
    group,
    set: !!process.env[key],
    preview: process.env[key]
      ? `${process.env[key]!.slice(0, 4)}${"*".repeat(Math.min(process.env[key]!.length - 4, 12))}`
      : null,
  }));

  const res: ApiResponse = { success: true, data: status };
  return NextResponse.json(res);
};
