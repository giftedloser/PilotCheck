import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";

import type {
  RuleDefinition,
  RulePredicate,
  RuleScope,
  RuleSeverity
} from "../../../shared/types.js";

interface RuleRow {
  id: string;
  name: string;
  description: string;
  severity: string;
  scope: string;
  scope_value: string | null;
  enabled: number;
  predicate: string;
  created_at: string;
  updated_at: string;
}

function rowToRule(row: RuleRow): RuleDefinition {
  let predicate: RulePredicate;
  try {
    predicate = JSON.parse(row.predicate) as RulePredicate;
  } catch {
    // Fall back to a no-op predicate so the rest of the engine keeps working
    // even if a rule's stored JSON is corrupt.
    predicate = { type: "and", children: [] };
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    severity: (row.severity as RuleSeverity) ?? "warning",
    scope: (row.scope as RuleScope) ?? "global",
    scopeValue: row.scope_value,
    enabled: row.enabled === 1,
    predicate,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listRules(db: Database.Database): RuleDefinition[] {
  const rows = db
    .prepare("SELECT * FROM rule_definitions ORDER BY created_at ASC")
    .all() as RuleRow[];
  return rows.map(rowToRule);
}

export function getRule(db: Database.Database, id: string): RuleDefinition | null {
  const row = db
    .prepare("SELECT * FROM rule_definitions WHERE id = ?")
    .get(id) as RuleRow | undefined;
  return row ? rowToRule(row) : null;
}

export interface RuleInput {
  name: string;
  description?: string;
  severity: RuleSeverity;
  scope: RuleScope;
  scopeValue?: string | null;
  enabled?: boolean;
  predicate: RulePredicate;
}

export function createRule(db: Database.Database, input: RuleInput): RuleDefinition {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO rule_definitions
       (id, name, description, severity, scope, scope_value, enabled, predicate, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.description ?? "",
    input.severity,
    input.scope,
    input.scopeValue ?? null,
    input.enabled === false ? 0 : 1,
    JSON.stringify(input.predicate),
    now,
    now
  );
  return getRule(db, id)!;
}

export function updateRule(
  db: Database.Database,
  id: string,
  input: Partial<RuleInput>
): RuleDefinition | null {
  const existing = getRule(db, id);
  if (!existing) return null;
  const merged: RuleInput = {
    name: input.name ?? existing.name,
    description: input.description ?? existing.description,
    severity: input.severity ?? existing.severity,
    scope: input.scope ?? existing.scope,
    scopeValue: input.scopeValue ?? existing.scopeValue,
    enabled: input.enabled ?? existing.enabled,
    predicate: input.predicate ?? existing.predicate
  };
  db.prepare(
    `UPDATE rule_definitions SET
       name = ?,
       description = ?,
       severity = ?,
       scope = ?,
       scope_value = ?,
       enabled = ?,
       predicate = ?,
       updated_at = ?
     WHERE id = ?`
  ).run(
    merged.name,
    merged.description ?? "",
    merged.severity,
    merged.scope,
    merged.scopeValue ?? null,
    merged.enabled === false ? 0 : 1,
    JSON.stringify(merged.predicate),
    new Date().toISOString(),
    id
  );
  return getRule(db, id);
}

export function deleteRule(db: Database.Database, id: string): boolean {
  const info = db.prepare("DELETE FROM rule_definitions WHERE id = ?").run(id);
  return info.changes > 0;
}
