import fs from "node:fs";
import path from "node:path";

import type Database from "better-sqlite3";

import { snapshotDatabase } from "./snapshot.js";

const migrationsDirCandidates = [
  path.resolve(process.cwd(), "src/server/db/migrations"),
  path.resolve(process.cwd(), "dist/server/migrations")
];

function getMigrationsDir() {
  const existing = migrationsDirCandidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    throw new Error(`Could not locate SQL migrations. Checked: ${migrationsDirCandidates.join(", ")}`);
  }
  return existing;
}

export function runMigrations(db: Database.Database) {
  // Imported lazily so this module can run before config has finished
  // resolving env vars (load-env still races to write SESSION_SECRET).
  // The snapshot helper is only needed when applied.size > 0.
  const migrationsDir = getMigrationsDir();
  const applied = new Set(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
      .all().length
      ? (db.prepare("SELECT id FROM schema_migrations").all() as Array<{ id: string }>).map(
          (row) => row.id
        )
      : []
  );

  const pending = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql") && !applied.has(file))
    .sort();

  if (pending.length === 0) return;

  // Snapshot the live DB before applying any pending migrations. We
  // skip this on a fresh install (no schema_migrations table yet means
  // there is nothing worth backing up).
  if (applied.size > 0) {
    snapshotDatabase(db, "pre-migrate");
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
      file,
      new Date().toISOString()
    );
  }
}
