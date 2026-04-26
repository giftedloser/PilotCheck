import { Writable } from "node:stream";

import pino from "pino";

export interface LogEntry {
  time: string;
  level: string;
  msg: string;
  // Anything else pino attaches (err, ruleId, etc.).
  [key: string]: unknown;
}

const LEVEL_NAMES: Record<number, LogEntry["level"]> = {
  10: "trace",
  20: "debug",
  30: "info",
  40: "warn",
  50: "error",
  60: "fatal"
};

const RING_CAPACITY = 500;
const ring: LogEntry[] = [];

function pushEntry(entry: LogEntry) {
  ring.push(entry);
  if (ring.length > RING_CAPACITY) ring.splice(0, ring.length - RING_CAPACITY);
}

const ringStream = new Writable({
  write(chunk, _encoding, callback) {
    try {
      const text = chunk.toString("utf8");
      // pino emits one NDJSON record per write but a single chunk can
      // contain several when load is high — split on newlines.
      for (const line of text.split("\n")) {
        if (!line) continue;
        const parsed = JSON.parse(line) as Record<string, unknown>;
        const level = typeof parsed.level === "number" ? LEVEL_NAMES[parsed.level] ?? "info" : "info";
        pushEntry({
          time: new Date(Number(parsed.time ?? Date.now())).toISOString(),
          level,
          msg: typeof parsed.msg === "string" ? parsed.msg : "",
          ...parsed
        });
      }
    } catch {
      // Never let log capture crash the process.
    }
    callback();
  }
});

export const logger = pino(
  { level: process.env.LOG_LEVEL ?? "info" },
  pino.multistream([
    { stream: process.stdout },
    { stream: ringStream }
  ])
);

export function readRecentLogs(opts: { level?: string; limit?: number } = {}): LogEntry[] {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), RING_CAPACITY);
  const wantedLevel = opts.level;
  const wantedRank = wantedLevel
    ? ({ trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 } as const)[
        wantedLevel as "info"
      ] ?? 30
    : 0;
  const filtered = wantedRank
    ? ring.filter(
        (entry) =>
          (({ trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 } as const)[
            entry.level as "info"
          ] ?? 30) >= wantedRank
      )
    : ring;
  return filtered.slice(-limit).reverse();
}
