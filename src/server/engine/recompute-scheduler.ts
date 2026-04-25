import type Database from "better-sqlite3";

import { logger } from "../logger.js";
import { computeAllDeviceStates } from "./compute-all-device-states.js";

// Coalesces bursty recompute requests (rule edits, tag-config changes) into
// a single background pass. Route handlers must not block the event loop
// recomputing device state on a multi-thousand-device fleet — they mark
// the engine dirty and return immediately.

const DEBOUNCE_MS = 250;

let pending = false;
let running = false;
let timer: NodeJS.Timeout | null = null;

export function scheduleRecompute(db: Database.Database) {
  pending = true;
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    drain(db);
  }, DEBOUNCE_MS);
  timer.unref?.();
}

function drain(db: Database.Database) {
  if (running) {
    // Another drain is in flight; the still-pending flag will trigger a
    // re-run from the in-flight drain itself.
    return;
  }
  if (!pending) return;
  pending = false;
  running = true;
  setImmediate(() => {
    try {
      computeAllDeviceStates(db);
    } catch (error) {
      logger.error({ err: error }, "Background recompute failed.");
    } finally {
      running = false;
      if (pending) drain(db);
    }
  });
}
