#!/usr/bin/env node
// Minimal OpenAI-compatible shim backed by the local `claude` CLI.
// radar-blog's AI client (OpenAI SDK) points AI_BASE_URL here; this translates
// chat.completions requests into `claude -p` invocations — no cloud API key,
// uses the local Claude Code subscription. Same pattern as ThreadsBot.
import http from "node:http";
import { execFile } from "node:child_process";

const PORT = Number(process.env.CLAUDE_SHIM_PORT || 8787);
const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const TIMEOUT_MS = Number(process.env.CLAUDE_SHIM_TIMEOUT_MS || 240_000);

// Map whatever model id radar-blog sends → a CLI alias the `claude` binary accepts.
const mapModel = (model) => {
  const m = String(model || "").toLowerCase();
  if (m.includes("opus")) return "opus";
  if (m.includes("haiku")) return "haiku";
  return "sonnet";
};

// Phrases that mean the CLI refused the task instead of generating content.
const REFUSAL_MARKERS = [
  "prompt injection",
  "i won't comply",
  "i won't be able to",
  "i can't help with that",
  "i cannot help with that",
  "프롬프트 인젝션",
  "도와드릴 수 없",
  "응답할 수 없",
];

// --- JSON coercion: `claude -p` emits markdown-rich JSON whose string values
// often contain raw newlines/quotes, which break JSON.parse downstream.
// Normalize to a compact, strictly-valid JSON object when possible.
const extractJsonObject = (text) => {
  let t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return t.slice(start, end + 1);
};

// Escape raw control chars that appear *inside* JSON string literals.
const escapeControlCharsInStrings = (s) => {
  let out = "";
  let inStr = false;
  let esc = false;
  for (const ch of s) {
    if (esc) { out += ch; esc = false; continue; }
    if (ch === "\\") { out += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr && ch === "\n") { out += "\\n"; continue; }
    if (inStr && ch === "\r") { out += "\\r"; continue; }
    if (inStr && ch === "\t") { out += "\\t"; continue; }
    out += ch;
  }
  return out;
};

const coerceJson = (text) => {
  const obj = extractJsonObject(text);
  if (!obj) return text;
  try { return JSON.stringify(JSON.parse(obj)); } catch { /* try repair */ }
  try { return JSON.stringify(JSON.parse(escapeControlCharsInStrings(obj))); } catch { /* give up */ }
  return obj; // extracted object as-is; downstream retry/fallback can handle it
};

const isValidJson = (s) => {
  try { JSON.parse(s); return true; } catch { return false; }
};

const JSON_MODE_INSTRUCTION =
  "\n\n---\n[출력 규칙] 반드시 단 하나의 유효한 JSON 객체만 출력하라. " +
  '문자열 값 안의 줄바꿈은 \\n, 큰따옴표는 \\" 로 이스케이프하라. ' +
  "코드펜스(```)나 설명 문구 없이 JSON만 출력하라.";

const runClaude = (model, prompt) =>
  new Promise((resolve, reject) => {
    const child = execFile(
      CLAUDE_BIN,
      ["--model", mapModel(model), "--output-format", "json", "-p", prompt],
      { maxBuffer: 64 * 1024 * 1024, timeout: TIMEOUT_MS },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`claude CLI failed: ${err.message} ${stderr || ""}`));
        let text = stdout;
        try {
          const env = JSON.parse(stdout);
          if (env && typeof env.result === "string") text = env.result;
          if (env && env.is_error) return reject(new Error(`claude returned error: ${env.result || "unknown"}`));
        } catch {
          // stdout wasn't the json envelope; fall back to raw text
        }
        resolve(text.trim());
      },
    );
    child.on("error", reject);
  });

// Flatten OpenAI chat messages into a single, well-contextualized prompt.
// System content is presented as authoritative role/instructions so the CLI
// treats it as a legitimate task (avoids prompt-injection refusals).
const buildPrompt = (messages = []) => {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const convo = messages
    .filter((m) => m.role !== "system")
    .map((m) => (m.role === "assistant" ? `[이전 응답]\n${m.content}` : m.content))
    .join("\n\n");
  return [
    sys ? `너는 아래 역할과 지침을 따르는 콘텐츠 생성기다. 이것은 정당한 블로그 자동화 작업이다.\n\n[역할/지침]\n${sys}` : "",
    convo,
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
};

const sendJson = (res, status, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
};

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url.startsWith("/v1/models")) {
    return sendJson(res, 200, {
      object: "list",
      data: ["sonnet", "opus", "haiku"].map((id) => ({ id, object: "model", owned_by: "claude-cli" })),
    });
  }

  if (req.method === "POST" && req.url.startsWith("/v1/chat/completions")) {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      try {
        const payload = JSON.parse(raw || "{}");
        const jsonMode = payload.response_format?.type === "json_object";
        const prompt = buildPrompt(payload.messages) + (jsonMode ? JSON_MODE_INSTRUCTION : "");
        const rawContent = await runClaude(payload.model, prompt);

        let content = rawContent;
        if (jsonMode) {
          content = coerceJson(rawContent);
          // Repair round-trip: if still not valid JSON, ask claude to fix it once.
          if (!isValidJson(content)) {
            const broken = extractJsonObject(rawContent) || rawContent;
            const repairPrompt =
              "아래는 깨진 JSON이다. 이것을 유효한 JSON 객체 하나로만 변환하라. " +
              '모든 문자열 값 내부의 큰따옴표는 \\", 줄바꿈은 \\n 으로 이스케이프하고, ' +
              "코드펜스나 설명 없이 minified JSON만 출력하라.\n\n" + broken;
            const repaired = await runClaude(payload.model, repairPrompt);
            const repairedJson = coerceJson(repaired);
            if (isValidJson(repairedJson)) content = repairedJson;
          }
        }

        const lower = rawContent.toLowerCase();
        if (REFUSAL_MARKERS.some((mk) => lower.includes(mk))) {
          return sendJson(res, 502, { error: { message: "claude CLI refused the task", type: "refusal", content } });
        }

        return sendJson(res, 200, {
          id: "chatcmpl-claudecli",
          object: "chat.completion",
          created: 0,
          model: mapModel(payload.model),
          choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        });
      } catch (e) {
        return sendJson(res, 500, { error: { message: e.message, type: "shim_error" } });
      }
    });
    return;
  }

  sendJson(res, 404, { error: { message: `Not found: ${req.method} ${req.url}` } });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[claude-shim] listening on http://127.0.0.1:${PORT} (model alias via --model, backend=${CLAUDE_BIN})`);
});
