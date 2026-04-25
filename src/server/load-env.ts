import path from "node:path";
import fs from "node:fs";
import { randomBytes } from "node:crypto";

import dotenv from "dotenv";

let loaded = false;

function resolveCandidatePaths() {
  const candidates = new Set<string>();

  if (process.env.PILOTCHECK_ENV_PATH) {
    candidates.add(path.resolve(process.env.PILOTCHECK_ENV_PATH));
  }

  if (process.env.PILOTCHECK_APP_DATA_DIR) {
    candidates.add(path.resolve(process.env.PILOTCHECK_APP_DATA_DIR, ".env"));
  }

  candidates.add(path.resolve(process.cwd(), ".env"));

  return [...candidates];
}

function preferredWritePath(): string {
  if (process.env.PILOTCHECK_ENV_PATH) {
    return path.resolve(process.env.PILOTCHECK_ENV_PATH);
  }
  if (process.env.PILOTCHECK_APP_DATA_DIR) {
    return path.resolve(process.env.PILOTCHECK_APP_DATA_DIR, ".env");
  }
  return path.resolve(process.cwd(), ".env");
}

// Persist a freshly-generated SESSION_SECRET into the same .env file the
// server reads on next boot. Without this, packaged desktop builds (which
// run with NODE_ENV=production but no pre-existing .env) hit the
// default-secret guard in config.ts and refuse to start.
function ensurePersistedSessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length > 0) return;

  const target = preferredWritePath();
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const secret = randomBytes(32).toString("hex");
    const existing = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
    const eol = existing.includes("\r\n") ? "\r\n" : "\n";
    const trailer = existing.length === 0 || existing.endsWith(eol) ? "" : eol;
    fs.appendFileSync(target, `${trailer}SESSION_SECRET=${secret}${eol}`, {
      encoding: "utf8",
      mode: 0o600
    });
    process.env.SESSION_SECRET = secret;
  } catch {
    // If we cannot persist, fall through. config.ts will fail-fast in
    // production with a clear message, which is preferable to silently
    // running with the default secret.
  }
}

export function loadPilotCheckEnv() {
  if (loaded) return;
  loaded = true;

  for (const envPath of resolveCandidatePaths()) {
    if (!fs.existsSync(envPath)) continue;
    dotenv.config({ path: envPath, override: false });
  }

  ensurePersistedSessionSecret();
}
