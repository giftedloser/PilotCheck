import Database from "better-sqlite3";
import request from "supertest";
import { beforeEach, describe, it } from "vitest";

import { createApp } from "../../src/server/app.js";
import { runMigrations } from "../../src/server/db/migrate.js";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  runMigrations(db);
});

describe("GET /api/graph/users auth", () => {
  it("requires delegated admin auth", async () => {
    await request(createApp(db)).get("/api/graph/users?q=alex").expect(401);
  });
});
