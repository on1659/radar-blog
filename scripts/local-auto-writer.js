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

  const { response, body } = await postJson(url, apiKey);
  const data = body && typeof body === "object" ? body.data : undefined;

  if (!response.ok) {
    throw new Error(`${job} failed with HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  if (data?.skipped) {
    log(`${job} skipped: ${data.reason || "no reason provided"}`);
    return;
  }

  if (data?.postId) {
    log(`${job} created post: ${data.postId}`);
    return;
  }

  log(`${job} completed: ${JSON.stringify(body)}`);
};

run().catch((error) => {
  console.error(`[${new Date().toISOString()}] ${error.stack || error.message}`);
  process.exit(1);
});
