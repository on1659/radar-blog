#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");

const DEFAULT_ENV_FILE = path.join(os.homedir(), ".config/radar-blog/auto-writer.env");
const JOBS = {
  "daily-ai": "/api/v1/daily-ai/trigger",
  "claude-ai": "/api/v1/daily-ai/claude-trigger",
};

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
};

const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
};

const postJson = async (url, apiKey) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
};

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Fetch the created post (title/slug) via the external posts API.
const fetchPost = async (baseUrl, apiKey, postId) => {
  try {
    const res = await fetch(`${baseUrl}/api/v1/posts/${postId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body && typeof body === "object" ? body.data : null;
  } catch {
    return null;
  }
};

// Notify Telegram when a post is published. No-op if TELEGRAM_* not configured.
const notifyTelegram = async (publicUrl, post, postId) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const title = post?.title || "새 글";
  const link = post?.slug ? `${publicUrl}/post/${post.slug}` : `${publicUrl}/signal`;
  const tag = post?.category === "hallucination" ? "⚠️ 검수 실패 글" : "📝 새 글 발행";
  const text = `${tag}\n<b>${escapeHtml(title)}</b>\n${link}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const d = await res.json();
    if (!d.ok) log(`Telegram failed: ${d.description}`);
    else log(`Telegram notified: ${title}`);
  } catch (e) {
    log(`Telegram error: ${e.message}`);
  }
};

const run = async () => {
  const job = process.argv[2];
  if (!JOBS[job]) {
    const choices = Object.keys(JOBS).join(", ");
    throw new Error(`Usage: node scripts/local-auto-writer.js <${choices}>`);
  }

  const envFile = process.env.AUTO_WRITER_ENV_FILE || DEFAULT_ENV_FILE;
  loadEnvFile(envFile);

  const baseUrl = (process.env.BLOG_BASE_URL || "https://radarlog.kr").replace(/\/$/, "");
  const apiKey = requireEnv("BLOG_API_KEY");
  const url = `${baseUrl}${JOBS[job]}`;

  log(`Triggering ${job}: ${url}`);

  if (process.env.AUTO_WRITER_DRY_RUN === "true") {
    log("Dry run enabled; request skipped.");
    return;
  }

  const maxAttempts = Number(process.env.AUTO_WRITER_MAX_ATTEMPTS || 3);
  const retryDelayMs = Number(process.env.AUTO_WRITER_RETRY_DELAY_MS || 5000);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { response, body } = await postJson(url, apiKey);
      const data = body && typeof body === "object" ? body.data : undefined;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
      }

      // skip = deliberate gate (no fresh items / cooldown), NOT a failure → don't retry
      if (data?.skipped) {
        log(`${job} skipped: ${data.reason || "no reason provided"}`);
        return;
      }

      if (data?.postId) {
        log(`${job} created post: ${data.postId} (attempt ${attempt}/${maxAttempts})`);
        const publicUrl = (process.env.BLOG_PUBLIC_URL || "https://radarlog.kr").replace(/\/$/, "");
        const post = await fetchPost(baseUrl, apiKey, data.postId);
        await notifyTelegram(publicUrl, post, data.postId);
        return;
      }

      log(`${job} completed: ${JSON.stringify(body)}`);
      return;
    } catch (err) {
      log(`${job} attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
      if (attempt >= maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
};

run().catch((error) => {
  console.error(`[${new Date().toISOString()}] ${error.stack || error.message}`);
  process.exit(1);
});
