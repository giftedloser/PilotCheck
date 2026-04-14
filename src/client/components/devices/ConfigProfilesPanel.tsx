import { Settings2 } from "lucide-react";

import type { DeviceDetailResponse } from "../../lib/types.js";
import { Card } from "../ui/card.js";
import { cn } from "../../lib/utils.js";

const STATE_STYLES: Record<string, { label: string; className: string }> = {
  succeeded: {
    label: "Succeeded",
    className: "bg-[var(--pc-healthy-muted)] text-emerald-200 ring-1 ring-[var(--pc-healthy)]/40"
  },
  failed: {
    label: "Failed",
    className: "bg-[var(--pc-critical-muted)] text-red-200 ring-1 ring-[var(--pc-critical)]/40"
  },
  error: {
    label: "Error",
    className: "bg-[var(--pc-critical-muted)] text-red-200 ring-1 ring-[var(--pc-critical)]/40"
  },
  conflict: {
    label: "Conflict",
    className: "bg-[var(--pc-warning-muted)] text-amber-200 ring-1 ring-[var(--pc-warning)]/40"
  },
  pending: {
    label: "Pending",
    className: "bg-[var(--pc-info-muted)] text-blue-200 ring-1 ring-[var(--pc-info)]/40"
  },
  notapplicable: {
    label: "N/A",
    className: "bg-white/[0.04] text-[var(--pc-text-muted)] ring-1 ring-white/10"
  },
  unknown: {
    label: "Unknown",
    className: "bg-white/[0.04] text-[var(--pc-text-muted)] ring-1 ring-white/10"
  }
};

function stateInfo(state: string) {
  const key = state.toLowerCase().replace(/\s+/g, "");
  return STATE_STYLES[key] ?? STATE_STYLES.unknown;
}

export function ConfigProfilesPanel({ device }: { device: DeviceDetailResponse }) {
  const { configProfiles } = device;

  if (configProfiles.length === 0) return null;

  const failing = configProfiles.filter(
    (p) => p.state.toLowerCase() === "failed" || p.state.toLowerCase() === "error" || p.state.toLowerCase() === "conflict"
  );

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-[var(--pc-accent)]" />
        <span className="text-[13px] font-semibold text-white">Configuration Profiles</span>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] text-[var(--pc-text-muted)]">
          {configProfiles.length}
        </span>
        {failing.length > 0 && (
          <span className="rounded-full bg-[var(--pc-critical-muted)] px-2 py-0.5 text-[10.5px] text-red-200">
            {failing.length} failing
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {configProfiles.map((p) => {
          const info = stateInfo(p.state);
          return (
            <div
              key={p.profileId}
              className="flex items-center justify-between rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-3.5 py-2.5"
            >
              <span className="min-w-0 truncate text-[12.5px] text-[var(--pc-text)]">
                {p.profileName}
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
