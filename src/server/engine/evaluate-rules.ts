import type {
  RuleDefinition,
  RuleOp,
  RulePredicate,
  RuleViolation
} from "../../shared/types.js";
import { logger } from "../logger.js";

// Track which rules have already logged a predicate error during this
// process lifetime so we don't spam the log every recompute. The set is
// keyed by ruleId so a fix that flips the predicate back to valid will
// silently start matching again on next eval.
const loggedPredicateErrors = new Set<string>();

/**
 * Flat record of fields the rule DSL can evaluate against. Keep this in
 * sync with the field set advertised in the Settings UI — the DSL is
 * intentionally untyped at the field level so the engine has to be
 * tolerant of missing or oddly-shaped values.
 */
export type RuleContext = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Pure rule evaluator. Side-effect free over a single device's context.
 * Returns one violation per matching rule, in declaration order.
 */
export function evaluateRules(
  rules: RuleDefinition[],
  context: RuleContext
): RuleViolation[] {
  const violations: RuleViolation[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!matchesScope(rule, context)) continue;
    let matched = false;
    try {
      matched = evalPredicate(rule.predicate, context);
    } catch (error) {
      // A malformed predicate must never crash the sync. Treat as
      // "did not match", but log once per rule so a broken rule is
      // discoverable instead of silently no-op'ing across the fleet.
      matched = false;
      if (!loggedPredicateErrors.has(rule.id)) {
        loggedPredicateErrors.add(rule.id);
        logger.warn(
          { err: error, ruleId: rule.id, ruleName: rule.name },
          "Rule predicate threw during evaluation; rule will not match until fixed."
        );
      }
    }
    if (matched) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        description: rule.description
      });
    }
  }
  return violations;
}

function matchesScope(rule: RuleDefinition, context: RuleContext): boolean {
  if (rule.scope === "global" || !rule.scopeValue) return true;
  if (rule.scope === "property") {
    return String(context.propertyLabel ?? "") === rule.scopeValue;
  }
  if (rule.scope === "profile") {
    return String(context.assignedProfileName ?? "") === rule.scopeValue;
  }
  return true;
}

function evalPredicate(node: RulePredicate, context: RuleContext): boolean {
  if (node.type === "and") {
    return node.children.every((child) => evalPredicate(child, context));
  }
  if (node.type === "or") {
    return node.children.some((child) => evalPredicate(child, context));
  }
  if (node.type === "not") {
    return !evalPredicate(node.child, context);
  }
  return evalLeaf(node.field, node.op, node.value, context);
}

function evalLeaf(
  field: string,
  op: RuleOp,
  value: string | number | boolean | null,
  context: RuleContext
): boolean {
  const raw = context[field];

  switch (op) {
    case "exists":
      return raw !== undefined && raw !== null && raw !== "";
    case "missing":
      return raw === undefined || raw === null || raw === "";
    case "eq":
      return normalize(raw) === normalize(value);
    case "neq":
      return normalize(raw) !== normalize(value);
    case "contains":
      return typeof raw === "string" && typeof value === "string"
        ? raw.toLowerCase().includes(value.toLowerCase())
        : false;
    case "not_contains":
      return typeof raw === "string" && typeof value === "string"
        ? !raw.toLowerCase().includes(value.toLowerCase())
        : true;
    case "starts_with":
      return typeof raw === "string" && typeof value === "string"
        ? raw.toLowerCase().startsWith(value.toLowerCase())
        : false;
    case "ends_with":
      return typeof raw === "string" && typeof value === "string"
        ? raw.toLowerCase().endsWith(value.toLowerCase())
        : false;
    case "older_than_hours":
      return compareHours(raw, value, "older");
    case "newer_than_hours":
      return compareHours(raw, value, "newer");
    case "in":
      return matchInList(raw, value, true);
    case "not_in":
      return matchInList(raw, value, false);
    default:
      return false;
  }
}

function normalize(value: string | number | boolean | null | undefined) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.toLowerCase();
  return value;
}

function compareHours(
  raw: string | number | boolean | null | undefined,
  value: string | number | boolean | null,
  direction: "older" | "newer"
): boolean {
  if (typeof raw !== "string" || typeof value !== "number") return false;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return false;
  const ageHours = (Date.now() - date.getTime()) / (60 * 60 * 1000);
  return direction === "older" ? ageHours > value : ageHours < value;
}

function matchInList(
  raw: string | number | boolean | null | undefined,
  value: string | number | boolean | null,
  inclusive: boolean
): boolean {
  if (typeof value !== "string") return !inclusive;
  const list = value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  const normalized = normalize(raw);
  if (normalized === null) return !inclusive;
  const present = list.includes(String(normalized));
  return inclusive ? present : !present;
}
