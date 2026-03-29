import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getWritingStyle, buildSystemPrompt, type WritingCategory } from "@/config/writing-style";

/* ───── Provider Configs ───── */

const PROVIDER_CONFIGS: Record<string, { baseURL: string; envKey: string; defaultModel: string }> = {
  anthropic: { baseURL: "https://api.anthropic.com/v1", envKey: "ANTHROPIC_API_KEY", defaultModel: "claude-sonnet-4-20250514" },
  openai:    { baseURL: "https://api.openai.com/v1", envKey: "OPENAI_API_KEY", defaultModel: "gpt-4o" },
  google:    { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", envKey: "GEMINI_API_KEY", defaultModel: "gemini-2.5-flash" },
  xai:       { baseURL: "https://api.x.ai/v1", envKey: "XAI_API_KEY", defaultModel: "grok-3" },
  zai:       { baseURL: "https://api.z.ai/api/coding/paas/v4", envKey: "Z_AI_API_KEY", defaultModel: "glm-5.1" },
  custom:    { baseURL: "", envKey: "AI_API_KEY", defaultModel: "claude-sonnet-4-20250514" },
};

export const getAIConfig = async (): Promise<{ baseURL: string; apiKey: string; model: string }> => {
  // Fast path: generic env vars override everything
  if (process.env.AI_BASE_URL && process.env.AI_API_KEY) {
    return {
      baseURL: process.env.AI_BASE_URL,
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL ?? "claude-sonnet-4-20250514",
    };
  }

  // Read DB settings for provider/model selection
  const settings = await prisma.setting.findMany({
    where: { key: { in: ["ai_provider", "ai_model"] } },
  });
  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const provider = settingsMap["ai_provider"] ?? "zai";
  const config = PROVIDER_CONFIGS[provider] ?? PROVIDER_CONFIGS["zai"];

  const apiKey = process.env.AI_API_KEY ?? process.env[config.envKey] ?? "";
  if (!apiKey) {
    throw new Error(
      `AI API key not configured. Set AI_API_KEY or ${config.envKey} environment variable.`
    );
  }

  return {
    baseURL: process.env.AI_BASE_URL ?? config.baseURL,
    apiKey,
    model: process.env.AI_MODEL ?? settingsMap["ai_model"] ?? config.defaultModel,
  };
};

/* ───── Response Formats ───── */

const COMMITS_RESPONSE_FORMAT = `반드시 JSON으로 응답:
{
  "title": "글 제목 (커밋 내용을 한 줄로 요약, 기술적이면서 흥미로운 제목)",
  "content": "마크다운 본문 (## 헤딩 사용, 코드 블록 포함)",
  "titleEn": "English title (same content, natural English)",
  "contentEn": "English markdown body (same structure, natural conversational English)",
  "tags": ["태그1", "태그2", "태그3"]
}`;

const BRIEF_RESPONSE_FORMAT = `반드시 JSON으로 응답:
{
  "title": "커밋 한 줄 요약 제목",
  "content": "마크다운 본문 (헤딩 없이 문단 + 선택적 코드 블록)",
  "titleEn": "English commit summary title",
  "contentEn": "English markdown body (same content, natural English)",
  "tags": ["태그1", "태그2"]
}`;

/* ───── Generate ───── */

interface GenerateOptions {
  commitMessage: string;
  diff: string;
  repoName: string;
  filesChanged: { filename: string; status: string; additions?: number; deletions?: number; patch?: string }[];
  customPrompt?: string;
  locale?: "ko" | "en";
  brief?: boolean;
}

export const generateBlogContent = async ({
  commitMessage,
  repoName,
  filesChanged,
  customPrompt,
  locale = "ko",
  brief = false,
}: GenerateOptions): Promise<{ title: string; content: string; titleEn?: string; contentEn?: string; tags: string[] }> => {
  const { baseURL, apiKey, model } = await getAIConfig();
  const client = new OpenAI({ apiKey, baseURL });

  const filesSummary = filesChanged
    .map(
      (f) =>
        `- ${f.filename} (${f.status}, +${f.additions || 0}/-${f.deletions || 0})${
          f.patch ? `\n  \`\`\`\n  ${f.patch}\n  \`\`\`` : ""
        }`
    )
    .join("\n");

  const totalAdditions = filesChanged.reduce((sum, f) => sum + (f.additions || 0), 0);
  const totalDeletions = filesChanged.reduce((sum, f) => sum + (f.deletions || 0), 0);

  const category: WritingCategory = brief ? "brief" : "commits";
  const style = await getWritingStyle(category);
  const responseFormat = brief ? BRIEF_RESPONSE_FORMAT : COMMITS_RESPONSE_FORMAT;
  let systemPrompt = buildSystemPrompt(style, responseFormat, model);
  if (customPrompt) {
    systemPrompt += `\n\n## 추가 지시사항\n\n${customPrompt}`;
  }
  if (locale === "en") {
    systemPrompt += "\n\n## Language\n\nWrite in English. Natural, conversational tone.";
  }

  const response = await client.chat.completions.create({
    model,
    max_tokens: brief ? 2000 : 8000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `레포: ${repoName}
커밋 메시지: ${commitMessage}
변경 통계: ${filesChanged.length} files changed, +${totalAdditions} -${totalDeletions}

변경 파일:
${filesSummary}

이 커밋 내용을 바탕으로 기술 블로그 글을 작성해줘. JSON으로 응답해.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";

  // JSON 추출 (코드블록 감싸진 경우 처리)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  const usage = response.usage;
  const tokenBadge = usage
    ? `> 🤖 \`${usage.prompt_tokens} in / ${usage.completion_tokens} out / ${usage.total_tokens} total tokens\`\n\n`
    : "";

  return {
    title: parsed.title,
    content: tokenBadge + parsed.content,
    titleEn: parsed.titleEn || undefined,
    contentEn: parsed.contentEn ? tokenBadge + parsed.contentEn : undefined,
    tags: parsed.tags || [],
  };
};
