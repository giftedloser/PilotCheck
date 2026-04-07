import { ScrollText } from "lucide-react";

import type { DeviceDetailResponse, RuleSeverity } from "../../lib/types.js";
import { Card } from "../ui/card.js";

const SEVERITY_STYLES: Record<RuleSeverity, string> = {
  critical: "bg-[var(--pc-critical-muted)] text-red-200 ring-1 ring-[var(--pc-critical)]/40",
  warning: "bg-[var(--pc-warning-muted)] text-amber-200 ring-1 ring-[var(--pc-warning)]/40",
  info: "bg-[var(--pc-info-muted)] text-sky-200 ring-1 ring-[var(--pc-info)]/40"
};

export function RuleViolationsPanel({ device }: { device: DeviceDetailResponse }) {
  const violations = device.ruleViolations ?? [];
  if (violations.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-[var(--pc-accent)]" />
        <span className="text-[13px] font-semibold text-white">Custom Rule Violations</span>
        <span className="text-[11px] text-[var(--pc-text-muted)]">
          From your configured rules
        </span>
      </div>
      <ul className="space-y-2">
        {violations.map((violation) => (
          <li
            key={violation.ruleId}
            className="rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[13px] font-medium text-white">{violation.ruleName}</div>
              <span
                className={`rounded-md px-2 py-0.5 text-[10.5px] font-medium capitalize ${SEVERITY_STYLES[violation.severity]}`}
              >
                {violation.severity}
              </span>
            </div>
            {violation.description ? (
              <div className="mt-1 text-[12px] leading-relaxed text-[var(--pc-text-secondary)]">
                {violation.description}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
