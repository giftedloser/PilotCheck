import { Router, type Request, type Response } from "express";

import type Database from "better-sqlite3";

import { requireDelegatedAuth } from "../auth/auth-middleware.js";
import { config } from "../config.js";
import {
  getLastRetentionResult,
  runRetention,
  type RetentionResult
} from "../maintenance/retention.js";

interface HealthSummary {
  ok: boolean;
  dbReady: boolean;
  uptimeSeconds: number;
  graphConfigured: boolean;
  graphMissing: string[];
  lastSyncCompletedAt: string | null;
  syncBacklogMinutes: number | null;
  retention: RetentionResult | null;
}

function summarize(db: Database.Database): HealthSummary {
  const dbReady = Boolean(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'device_state'")
      .get()
  );

  // Lookup the most recent completed sync. sync_log may not have a row
  // yet on a fresh install, so we tolerate undefined.
  let lastSyncCompletedAt: string | null = null;
  if (dbReady) {
    const row = db
      .prepare("SELECT completed_at FROM sync_log WHERE completed_at IS NOT NULL ORDER BY id DESC LIMIT 1")
      .get() as { completed_at: string | null } | undefined;
    lastSyncCompletedAt = row?.completed_at ?? null;
  }

  let syncBacklogMinutes: number | null = null;
  if (lastSyncCompletedAt) {
    const ageMs = Date.now() - new Date(lastSyncCompletedAt).getTime();
    if (Number.isFinite(ageMs)) {
      syncBacklogMinutes = Math.round(ageMs / 60_000);
    }
  }

  // The service is "ok" when the DB is migrated and present. Graph
  // misconfiguration is a setup state, not a service outage, so we
  // surface it but don't 503 over it — external monitors should
  // distinguish "process is alive" from "process is doing useful
  // work". Sync staleness is similarly informational here.
  return {
    ok: dbReady,
    dbReady,
    uptimeSeconds: process.uptime(),
    graphConfigured: config.isGraphConfigured,
    graphMissing: config.graphMissing,
    lastSyncCompletedAt,
    syncBacklogMinutes,
    retention: getLastRetentionResult()
  };
}

function writeHealth(db: Database.Database, _request: Request, response: Response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Cache-Control", "no-store");
  const summary = summarize(db);
  response.status(summary.ok ? 200 : 503).json(summary);
}

export function healthRouter(db: Database.Database) {
  const router = Router();

  router.get("/", (request, response) => writeHealth(db, request, response));

  // Manual retention trigger for ops. Auth-gated because deleting
  // history on demand is a destructive maintenance action.
  router.post("/retention/run", requireDelegatedAuth, (_request, response) => {
    const result = runRetention(db);
    response.json(result);
  });

  return router;
}

/**
 * Top-level /healthz handler intended for external monitors (uptime
 * checks, process supervisors). Returns the same payload as
 * /api/health so a single endpoint can drive both human and machine
 * dashboards, but lives off the /api prefix so monitors can probe it
 * without an `/api/` rewrite rule.
 */
export function healthzHandler(db: Database.Database) {
  return (request: Request, response: Response) => writeHealth(db, request, response);
}
