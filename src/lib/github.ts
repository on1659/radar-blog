import { Octokit } from "@octokit/rest";

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export const getCommitDetail = async (
  owner: string,
  repo: string,
  ref: string
) => {
  const { data } = await octokit.repos.getCommit({ owner, repo, ref });

  return {
    sha: data.sha,
    message: data.commit.message,
    url: data.html_url,
    author: data.commit.author?.name || "unknown",
    date: data.commit.author?.date || new Date().toISOString(),
    files: (data.files || []).map((f) => ({
      filename: f.filename,
      status: f.status || "modified",
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch?.slice(0, 500),
    })),
  };
};

export const getRepoInfo = async (owner: string, repo: string) => {
  const { data } = await octokit.repos.get({ owner, repo });
  return {
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    language: data.language,
    url: data.html_url,
  };
};

export const createRepoWebhook = async (owner: string, repo: string): Promise<number | null> => {
  const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/github`;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) throw new Error("GITHUB_WEBHOOK_SECRET is not set");

  try {
    const { data } = await octokit.repos.createWebhook({
      owner,
      repo,
      config: {
        url: webhookUrl,
        content_type: "json",
        secret,
        insecure_ssl: "0",
      },
      events: ["push"],
      active: true,
    });
    return data.id;
  } catch (error: unknown) {
    // 이미 존재하는 경우 기존 훅 ID 반환
    if ((error as { status?: number }).status === 422) {
      const { data } = await octokit.repos.listWebhooks({ owner, repo });
      const existing = data.find((h) => h.config.url === webhookUrl);
      return existing?.id ?? null;
    }
    throw error;
  }
};

export const deleteRepoWebhook = async (owner: string, repo: string, hookId: number): Promise<void> => {
  await octokit.repos.deleteWebhook({ owner, repo, hook_id: hookId });
};
