import { ShieldCheck } from "lucide-react";

import type { DeviceDetailResponse } from "../../lib/types.js";
import { Card } from "../ui/card.js";
import { cn } from "../../lib/utils.js";

const STATE_STYLES: Record<string, { label: string; className: string }> = {
  compliant: {
    label: "Compliant",
    className: "bg-[var(--pc-healthy-muted)] text-[var(--pc-healthy)] ring-1 ring-[var(--pc-healthy)]/40"
  },
  noncompliant: {
    label: "Non-compliant",
    className: "bg-[var(--pc-critical-muted)] text-[var(--pc-critical)] ring-1 ring-[var(--pc-critical)]/40"
  },
  error: {
    label: "Error",
    className: "bg-[var(--pc-critical-muted)] text-[var(--pc-critical)] ring-1 ring-[var(--pc-critical)]/40"
  },
  conflict: {
    label: "Conflict",
    className: "bg-[var(--pc-warning-muted)] text-[var(--pc-warning)] ring-1 ring-[var(--pc-warning)]/40"
  },
  notapplicable: {
    label: "N/A",
    className: "bg-[var(--pc-tint-subtle)] text-[var(--pc-text-muted)] ring-1 ring-white/10"
  },
  ingraceperiod: {
    label: "Grace Period",
    className: "bg-[var(--pc-warning-muted)] text-[var(--pc-warning)] ring-1 ring-[var(--pc-warning)]/40"
  },
  unknown: {
    label: "Unknown",
    className: "bg-[var(--pc-tint-subtle)] text-[var(--pc-text-muted)] ring-1 ring-white/10"
  }
};

function stateInfo(state: string) {
  const key = state.toLowerCase().replace(/\s+/g, "");
  return STATE_STYLES[key] ?? STATE_STYLES.unknown;
}

export function CompliancePoliciesPanel({ device }: { device: DeviceDetailResponse }) {
  const { compliancePolicies } = device;

  if (compliancePolicies.length === 0) return null;

  const failing = compliancePolicies.filter(
    (p) => p.state.toLowerCase() === "noncompliant" || p.state.toLowerCase() === "error"
  );

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[var(--pc-accent)]" />
        <span className="text-[13px] font-semibold text-[var(--pc-text)]">Compliance Policies</span>
        <span className="rounded-full bg-[var(--pc-tint-hover)] px-2 py-0.5 text-[10.5px] text-[var(--pc-text-muted)]">
          {compliancePolicies.length}
        </span>
        {failing.length > 0 && (
          <span className="rounded-full bg-[var(--pc-critical-muted)] px-2 py-0.5 text-[10.5px] text-[var(--pc-critical)]">
            {failing.length} failing
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {compliancePolicies.map((p) => {
          const info = stateInfo(p.state);
          return (
            <div
              key={p.policyId}
              className="flex items-center justify-between rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-3.5 py-2.5"
            >
              <span className="min-w-0 truncate text-[12.5px] text-[var(--pc-text)]">
                {p.policyName}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-medium",
                  info.className
                )}
              >
                {info.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
