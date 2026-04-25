import { Cable, CheckCircle2, HelpCircle, XCircle } from "lucide-react";

import type { DeviceDetailResponse } from "../../lib/types.js";
import { formatManagementAgent, getConfigMgrSignal } from "../../lib/config-mgr.js";
import { cn } from "../../lib/utils.js";
import { SourceBadge } from "../shared/SourceBadge.js";
import { Card } from "../ui/card.js";

export function ConfigMgrConnectionPanel({
  device,
  enabled = true
}: {
  device: DeviceDetailResponse;
  enabled?: boolean;
}) {
  const signal = getConfigMgrSignal(device, enabled);
  const managementAgent = signal.rawValue;
  const tone = signal.status === "detected"
      ? "border-[var(--pc-healthy)]/35 bg-[var(--pc-healthy-muted)] text-[var(--pc-healthy)]"
    : signal.status === "not_detected"
      ? "border-[var(--pc-warning)]/35 bg-[var(--pc-warning-muted)] text-[var(--pc-warning)]"
      : "border-[var(--pc-border)] bg-[var(--pc-surface-raised)] text-[var(--pc-text-muted)]";
  const Icon =
    signal.status === "detected"
      ? CheckCircle2
      : signal.status === "not_detected"
        ? XCircle
        : HelpCircle;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Cable className="h-4 w-4 text-[var(--pc-accent)]" />
        <span className="text-[13px] font-semibold text-[var(--pc-text)]">
          SCCM / ConfigMgr Connection
        </span>
        <SourceBadge source="sccm" size="xs" />
      </div>

      <div className={cn("rounded-lg border px-4 py-3", tone)}>
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold">{signal.label}</div>
            <p className="mt-1 text-[12px] leading-relaxed">{signal.detail}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] p-3">
          <div className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-[var(--pc-text-muted)]">
            Intune managementAgent
          </div>
          <div className="font-mono text-[12px] text-[var(--pc-text)]">
            {managementAgent ?? "not available"}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] p-3">
          <div className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-[var(--pc-text-muted)]">
            Interpretation
          </div>
          <div className="text-[12.5px] text-[var(--pc-text)]">
            {formatManagementAgent(managementAgent)}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-tint-subtle)] px-3 py-2 text-[11.5px] leading-5 text-[var(--pc-text-muted)]">
        This is a read-only SCCM/ConfigMgr visibility check derived from Microsoft Graph / Intune.
        Runway is not connecting to a Configuration Manager site server or running SCCM actions.
      </div>
    </Card>
  );
}
