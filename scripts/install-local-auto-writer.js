#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const runner = path.join(repoRoot, "scripts/local-auto-writer.js");
const envFile = process.env.AUTO_WRITER_ENV_FILE || path.join(os.homedir(), ".config/radar-blog/auto-writer.env");
const launchAgentsDir = path.join(os.homedir(), "Library/LaunchAgents");
const logDir = path.join(os.homedir(), "Library/Logs/radar-blog");
const uid = process.getuid ? process.getuid() : null;

const agents = [
  {
    label: "kr.radarlog.auto-writer.daily-ai",
    job: "daily-ai",
    minutes: [0, 30],
  },
  {
    label: "kr.radarlog.auto-writer.claude-ai",
    job: "claude-ai",
    minutes: [15],
  },
];

const plistPath = (label) => path.join(launchAgentsDir, `${label}.plist`);

const xmlEscape = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const calendarXml = (minutes) => {
  const items = minutes
    .map((minute) => [
      "    <dict>",
      "      <key>Minute</key>",
      `      <integer>${minute}</integer>`,
      "    </dict>",
    ].join("\n"))
    .join("\n");

  return [
    "  <key>StartCalendarInterval</key>",
    "  <array>",
    items,
    "  </array>",
  ].join("\n");
};

const plist = ({ label, job, minutes }) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xmlEscape(label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(process.execPath)}</string>
    <string>${xmlEscape(runner)}</string>
    <string>${xmlEscape(job)}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>AUTO_WRITER_ENV_FILE</key>
    <string>${xmlEscape(envFile)}</string>
  </dict>
${calendarXml(minutes)}
  <key>StandardOutPath</key>
  <string>${xmlEscape(path.join(logDir, `${label}.out.log`))}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(path.join(logDir, `${label}.err.log`))}</string>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(repoRoot)}</string>
</dict>
</plist>
`;

const runLaunchctl = (args) => {
  const result = spawnSync("launchctl", args, { encoding: "utf8" });
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").trim();
    if (message) console.error(message);
  }
  return result.status === 0;
};

const loadEnvPreview = () => {
  if (!fs.existsSync(envFile)) return {};

  const entries = {};
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    entries[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return entries;
};

const ensureEnvFile = () => {
  if (fs.existsSync(envFile)) return true;

  fs.mkdirSync(path.dirname(envFile), { recursive: true });
  fs.writeFileSync(
    envFile,
    [
      "# Used by scripts/local-auto-writer.js. Do not commit this file.",
      "BLOG_BASE_URL=https://radarlog.kr",
      "BLOG_API_KEY=",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );

  console.error(`Created ${envFile}. Fill BLOG_API_KEY, then run npm run auto:install again.`);
  return false;
};

const install = () => {
  if (!ensureEnvFile()) process.exit(1);

  const env = loadEnvPreview();
  if (!env.BLOG_API_KEY) {
    console.error(`${envFile} exists, but BLOG_API_KEY is empty.`);
    process.exit(1);
  }

  fs.mkdirSync(launchAgentsDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });

  for (const agent of agents) {
    const file = plistPath(agent.label);
    fs.writeFileSync(file, plist(agent));

    if (uid !== null) {
      runLaunchctl(["bootout", `gui/${uid}`, file]);
      if (!runLaunchctl(["bootstrap", `gui/${uid}`, file])) process.exit(1);
    }
    console.log(`Installed ${agent.label}`);
  }
};

const uninstall = () => {
  for (const agent of agents) {
    const file = plistPath(agent.label);
    if (uid !== null) runLaunchctl(["bootout", `gui/${uid}`, file]);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    console.log(`Removed ${agent.label}`);
  }
};

const status = () => {
  for (const agent of agents) {
    const result = spawnSync("launchctl", ["print", `gui/${uid}/${agent.label}`], { encoding: "utf8" });
    console.log(`${agent.label}: ${result.status === 0 ? "loaded" : "not loaded"}`);
  }
};

const command = process.argv[2];
if (command === "install") install();
else if (command === "uninstall") uninstall();
else if (command === "status") status();
else {
  console.error("Usage: node scripts/install-local-auto-writer.js <install|uninstall|status>");
  process.exit(1);
}
