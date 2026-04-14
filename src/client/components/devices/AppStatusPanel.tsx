import { Package } from "lucide-react";

import type { DeviceDetailResponse } from "../../lib/types.js";
import { Card } from "../ui/card.js";
import { cn } from "../../lib/utils.js";

const STATE_STYLES: Record<string, { label: string; className: string }> = {
  installed: {
    label: "Installed",
    className: "bg-[var(--pc-healthy-muted)] text-emerald-200 ring-1 ring-[var(--pc-healthy)]/40"
  },
  failed: {
    label: "Failed",
    className: "bg-[var(--pc-critical-muted)] text-red-200 ring-1 ring-[var(--pc-critical)]/40"
  },
  pendinginstall: {
    label: "Pending",
    className: "bg-[var(--pc-info-muted)] text-blue-200 ring-1 ring-[var(--pc-info)]/40"
  },
  notinstalled: {
    label: "Not Installed",
    className: "bg-white/[0.04] text-[var(--pc-text-muted)] ring-1 ring-white/10"
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
  const key = state.toLowerCase().replace(/[\s_]+/g, "");
  return STATE_STYLES[key] ?? STATE_STYLES.unknown;
}

export function AppStatusPanel({ device }: { device: DeviceDetailResponse }) {
  const { appInstallStates } = device;

  if (appInstallStates.length === 0) return null;

  const failing = appInstallStates.filter((a) => a.installState.toLowerCase() === "failed");

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Package className="h-4 w-4 text-[var(--pc-accent)]" />
        <span className="text-[13px] font-semibold text-white">App Install Status</span>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] text-[var(--pc-text-muted)]">
          {appInstallStates.length}
        </span>
        {failing.length > 0 && (
          <span className="rounded-full bg-[var(--pc-critical-muted)] px-2 py-0.5 text-[10.5px] text-red-200">
            {failing.length} failed
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {appInstallStates.map((a) => {
          const info = stateInfo(a.installState);
          return (
            <div
              key={a.appId}
              className="flex items-center justify-between rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <span className="truncate text-[12.5px] text-[var(--pc-text)]">{a.appName}</span>
                {a.errorCode && (
                  <div className="mt-0.5 font-mono text-[10px] text-[var(--pc-critical)]">
                    Error: {a.errorCode}
                  </div>
                )}
              </div>
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
