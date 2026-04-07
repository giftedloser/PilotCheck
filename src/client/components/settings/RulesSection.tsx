import { useState } from "react";
import { Plus, ScrollText, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

import { useRuleMutations, useRules, type RuleInputPayload } from "../../hooks/useRules.js";
import type { RuleDefinition, RuleOp, RuleSeverity } from "../../lib/types.js";
import { Button } from "../ui/button.js";
import { Card } from "../ui/card.js";
import { Input } from "../ui/input.js";

const FIELD_OPTIONS = [
  "deviceName",
  "serialNumber",
  "propertyLabel",
  "groupTag",
  "assignedProfileName",
  "deploymentMode",
  "trustType",
  "complianceState",
  "lastCheckinAt",
  "osVersion",
  "hasAutopilotRecord",
  "hasIntuneRecord",
  "hasEntraRecord",
  "hybridJoinConfigured",
  "assignmentChainComplete",
  "flagCount"
] as const;

const OP_OPTIONS: Array<{ value: RuleOp; label: string; needsValue: boolean }> = [
  { value: "eq", label: "equals", needsValue: true },
  { value: "neq", label: "does not equal", needsValue: true },
  { value: "contains", label: "contains", needsValue: true },
  { value: "not_contains", label: "does not contain", needsValue: true },
  { value: "starts_with", label: "starts with", needsValue: true },
  { value: "ends_with", label: "ends with", needsValue: true },
  { value: "exists", label: "is present", needsValue: false },
  { value: "missing", label: "is missing", needsValue: false },
  { value: "in", label: "is one of (csv)", needsValue: true },
  { value: "not_in", label: "is none of (csv)", needsValue: true },
  { value: "older_than_hours", label: "older than (hours)", needsValue: true },
  { value: "newer_than_hours", label: "newer than (hours)", needsValue: true }
];

const SEVERITY_BADGE: Record<RuleSeverity, string> = {
  critical: "bg-[var(--pc-critical-muted)] text-red-200 ring-1 ring-[var(--pc-critical)]/40",
  warning: "bg-[var(--pc-warning-muted)] text-amber-200 ring-1 ring-[var(--pc-warning)]/40",
  info: "bg-[var(--pc-info-muted)] text-sky-200 ring-1 ring-[var(--pc-info)]/40"
};

interface FormState {
  name: string;
  description: string;
  severity: RuleSeverity;
  field: string;
  op: RuleOp;
  value: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  severity: "warning",
  field: "deploymentMode",
  op: "eq",
  value: ""
};

function buildPayload(form: FormState): RuleInputPayload {
  const opMeta = OP_OPTIONS.find((o) => o.value === form.op);
  let parsedValue: string | number | boolean | null = form.value;
  if (!opMeta?.needsValue) {
    parsedValue = null;
  } else if (form.op === "older_than_hours" || form.op === "newer_than_hours") {
    parsedValue = Number(form.value);
  }
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    severity: form.severity,
    scope: "global",
    scopeValue: null,
    enabled: true,
    predicate: {
      type: "leaf",
      field: form.field,
      op: form.op,
      value: parsedValue
    }
  };
}

function describePredicate(rule: RuleDefinition): string {
  if (rule.predicate.type !== "leaf") {
    return "Compound rule";
  }
  const opMeta = OP_OPTIONS.find((o) => o.value === rule.predicate.op);
  const value = opMeta?.needsValue ? ` ${String(rule.predicate.value ?? "")}` : "";
  return `${rule.predicate.field} ${opMeta?.label ?? rule.predicate.op}${value}`;
}

export function RulesSection() {
  const rules = useRules();
  const mutations = useRuleMutations();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const opMeta = OP_OPTIONS.find((o) => o.value === form.op);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--pc-text-secondary)]">
          5. Custom Rules
        </h2>
        <span className="text-[11px] text-[var(--pc-text-muted)]">
          Encode your own join, configuration, and posture expectations
        </span>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-[var(--pc-accent)]" />
            <div className="text-[13px] font-semibold text-white">Rule definitions</div>
          </div>
          <Button
            variant={showForm ? "secondary" : "default"}
            onClick={() => setShowForm((value) => !value)}
          >
            <Plus className="h-3.5 w-3.5" />
            {showForm ? "Cancel" : "New rule"}
          </Button>
        </div>

        {showForm ? (
          <div className="mb-5 grid gap-3 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] p-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-medium text-[var(--pc-text-muted)]">Name</label>
              <Input
                placeholder="e.g. Win11 23H2 floor"
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, name: event.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--pc-text-muted)]">Severity</label>
              <select
                value={form.severity}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    severity: event.target.value as RuleSeverity
                  }))
                }
                className="mt-1 w-full rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface)] px-2.5 py-1.5 text-[12px] text-[var(--pc-text)] focus:border-[var(--pc-accent)] focus:outline-none"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium text-[var(--pc-text-muted)]">
                Description
              </label>
              <Input
                placeholder="Why this rule matters and what to do when it fires"
                value={form.description}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, description: event.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--pc-text-muted)]">Field</label>
              <select
                value={form.field}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, field: event.target.value }))
                }
                className="mt-1 w-full rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface)] px-2.5 py-1.5 text-[12px] text-[var(--pc-text)] focus:border-[var(--pc-accent)] focus:outline-none"
              >
                {FIELD_OPTIONS.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-[var(--pc-text-muted)]">Operator</label>
              <select
                value={form.op}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, op: event.target.value as RuleOp }))
                }
                className="mt-1 w-full rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface)] px-2.5 py-1.5 text-[12px] text-[var(--pc-text)] focus:border-[var(--pc-accent)] focus:outline-none"
              >
                {OP_OPTIONS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
            {opMeta?.needsValue ? (
              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-[var(--pc-text-muted)]">Value</label>
                <Input
                  placeholder={
                    form.op === "in" || form.op === "not_in"
                      ? "comma,separated,values"
                      : "value"
                  }
                  value={form.value}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, value: event.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            ) : null}
            <div className="sm:col-span-2 flex items-center justify-between gap-2">
              <div className="text-[11px] text-[var(--pc-text-muted)]">
                Admin sign-in required to save rules.
              </div>
              <Button
                disabled={!form.name || mutations.create.isPending}
                onClick={() =>
                  mutations.create.mutate(buildPayload(form), {
                    onSuccess: () => {
                      setForm(EMPTY_FORM);
                      setShowForm(false);
                    }
                  })
                }
              >
                {mutations.create.isPending ? "Saving…" : "Save rule"}
              </Button>
            </div>
          </div>
        ) : null}

        {rules.isLoading ? (
          <div className="text-[12px] text-[var(--pc-text-muted)]">Loading rules…</div>
        ) : rules.isError ? (
          <div className="text-[12px] text-[var(--pc-critical)]">Could not load rules.</div>
        ) : !rules.data || rules.data.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-4 py-6 text-center text-[12px] text-[var(--pc-text-muted)]">
            No custom rules yet. Built-in flags still run; rules let you encode
            site-specific expectations on top.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--pc-border)]">
            {rules.data.map((rule) => (
              <li key={rule.id} className="flex items-start gap-3 py-3">
                <button
                  type="button"
                  className="mt-0.5 text-[var(--pc-text-muted)] hover:text-[var(--pc-accent)]"
                  title={rule.enabled ? "Disable rule" : "Enable rule"}
                  onClick={() =>
                    mutations.update.mutate({
                      id: rule.id,
                      input: { enabled: !rule.enabled }
                    })
                  }
                >
                  {rule.enabled ? (
                    <ToggleRight className="h-5 w-5 text-[var(--pc-healthy)]" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[13px] font-semibold text-white">{rule.name}</div>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ${SEVERITY_BADGE[rule.severity]}`}
                    >
                      {rule.severity}
                    </span>
                    {!rule.enabled ? (
                      <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[var(--pc-text-muted)]">
                        Disabled
                      </span>
                    ) : null}
                  </div>
                  {rule.description ? (
                    <div className="mt-0.5 text-[12px] text-[var(--pc-text-secondary)]">
                      {rule.description}
                    </div>
                  ) : null}
                  <div className="mt-1 font-mono text-[11px] text-[var(--pc-text-muted)]">
                    {describePredicate(rule)}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  className="h-8 px-2.5"
                  onClick={() => mutations.remove.mutate(rule.id)}
                  aria-label={`Delete ${rule.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
