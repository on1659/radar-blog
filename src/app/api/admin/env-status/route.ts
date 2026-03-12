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
  { key: "OPENAI_API_KEY", label: "OpenAI API Key (GPT)", group: "ai" },
  { key: "GOOGLE_AI_API_KEY", label: "Google AI API Key (Gemini)", group: "ai" },
  { key: "XAI_API_KEY", label: "xAI API Key (Grok)", group: "ai" },
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

// AI 프로바이더별 환경변수 매핑
const AI_PROVIDERS = [
  { id: "anthropic", label: "Claude (Anthropic)", envKey: "ANTHROPIC_API_KEY" },
  { id: "openai", label: "GPT (OpenAI)", envKey: "OPENAI_API_KEY" },
  { id: "google", label: "Gemini (Google)", envKey: "GOOGLE_AI_API_KEY" },
  { id: "xai", label: "Grok (xAI)", envKey: "XAI_API_KEY" },
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

  const aiProviders = AI_PROVIDERS.map(({ id, label, envKey }) => ({
    id,
    label,
    connected: !!process.env[envKey],
  }));

  const res: ApiResponse = { success: true, data: { envStatus: status, aiProviders } };
  return NextResponse.json(res);
};
