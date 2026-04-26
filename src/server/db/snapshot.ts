import fs from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

import { logger } from "../logger.js";

const SNAPSHOTS_DIRNAME = "snapshots";
const KEEP_PER_REASON = 3;

function snapshotsDir(databasePath: string): string {
  return path.join(path.dirname(databasePath), SNAPSHOTS_DIRNAME);
}

function pruneOldSnapshots(databasePath: string, reason: string) {
  const dir = snapshotsDir(databasePath);
  if (!fs.existsSync(dir)) return;
  const prefix = `${reason}-`;
  const matches = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".sqlite"))
    .map((name) => ({ name, mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const stale of matches.slice(KEEP_PER_REASON)) {
    try {
      fs.unlinkSync(path.join(dir, stale.name));
    } catch (error) {
      logger.warn({ err: error, file: stale.name }, "Failed to prune old snapshot.");
    }
  }
}

/**
 * Take a consistent on-disk snapshot of the live SQLite file before a
 * destructive maintenance step (schema migration, retention sweep).
 * Checkpoints the WAL first so the copy reflects every committed write,
 * then file-copies the .sqlite. Snapshots are kept per-reason; the last
 * KEEP_PER_REASON are retained, the rest are pruned. A snapshot failure
 * is logged but does not block the operation it preceded.
 */
export function snapshotDatabase(
  db: Database.Database,
  reason: "pre-migrate" | "pre-retention"
): string | null {
  try {
    // Derive the live DB path from the open handle so this helper is
    // independent of config (it runs from migrate before config is fully
    // resolved). In-memory DBs have name === ":memory:" — skip them.
    const dbPath = db.name;
    if (!dbPath || dbPath === ":memory:" || !fs.existsSync(dbPath)) return null;

    db.pragma("wal_checkpoint(PASSIVE)");

    const dir = snapshotsDir(dbPath);
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const target = path.join(dir, `${reason}-${stamp}.sqlite`);
    fs.copyFileSync(dbPath, target);
    pruneOldSnapshots(dbPath, reason);
    logger.info({ target, reason }, "Database snapshot taken.");
    return target;
  } catch (error) {
    logger.error({ err: error, reason }, "Database snapshot failed; continuing.");
    return null;
  }
}
