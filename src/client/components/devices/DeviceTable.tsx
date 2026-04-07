import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";

import type { DeviceListItem } from "../../lib/types.js";
import { cn } from "../../lib/utils.js";
import { FlagChip } from "../shared/FlagChip.js";
import { StatusBadge } from "../shared/StatusBadge.js";
import { Card } from "../ui/card.js";

export type DeviceTableDensity = "comfortable" | "compact";

export function DeviceTable({
  devices,
  density = "comfortable"
}: {
  devices: DeviceListItem[];
  density?: DeviceTableDensity;
}) {
  const cellY = density === "compact" ? "py-1.5" : "py-3";
  const cellX = "px-4";
  const cell = cn(cellX, cellY);
  if (devices.length === 0) {
    return (
      <Card className="px-5 py-10 text-center text-[13px] text-[var(--pc-text-muted)]">
        No devices match the current filters.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--pc-border)] text-[11px] font-medium text-[var(--pc-text-muted)]">
              <th className="px-4 py-3 text-left">Device</th>
              <th className="px-4 py-3 text-left">Serial</th>
              <th className="px-4 py-3 text-left">Health</th>
              <th className="px-4 py-3 text-left">Flags</th>
              <th className="px-4 py-3 text-left">Profile</th>
              <th className="px-4 py-3 text-left">Last Seen</th>
              <th className="w-8 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--pc-border)]">
            {devices.map((device) => (
              <tr
                key={device.deviceKey}
                className="transition-colors hover:bg-white/[0.02]"
              >
                <td className={cn("max-w-[260px]", cell)}>
                  <Link
                    to="/devices/$deviceKey"
                    params={{ deviceKey: device.deviceKey }}
                    className="block truncate font-medium text-white hover:text-[var(--pc-accent-hover)]"
                    title={device.deviceName ?? device.serialNumber ?? device.deviceKey}
                  >
                    {device.deviceName ?? device.serialNumber ?? device.deviceKey}
                  </Link>
                  {density === "comfortable" && device.propertyLabel && (
                    <div
                      className="mt-0.5 truncate text-[11px] text-[var(--pc-text-muted)]"
                      title={device.propertyLabel}
                    >
                      {device.propertyLabel}
                    </div>
                  )}
                </td>
                <td
                  className={cn(cell, "font-mono text-[12px] text-[var(--pc-text-secondary)]")}
                  title={device.serialNumber ?? undefined}
                >
                  {device.serialNumber ?? "\u2014"}
                </td>
                <td className={cell}>
                  <StatusBadge health={device.health} />
                </td>
                <td className={cell}>
                  <div className="flex flex-wrap gap-1">
                    {device.flags.slice(0, 2).map((flag) => (
                      <FlagChip key={flag} flag={flag} />
                    ))}
                    {device.flags.length > 2 && (
                      <span className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[var(--pc-text-muted)]">
                        +{device.flags.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td
                  className={cn("max-w-[200px] truncate text-[var(--pc-text-secondary)]", cell)}
                  title={device.assignedProfileName ?? undefined}
                >
                  {device.assignedProfileName ?? "\u2014"}
                </td>
                <td className={cn(cell, "text-[var(--pc-text-muted)]")}>
                  {device.lastCheckinAt
                    ? formatDistanceToNow(new Date(device.lastCheckinAt), { addSuffix: true })
                    : "Never"}
                </td>
                <td className={cn("px-2", cellY)}>
                  <Link
                    to="/devices/$deviceKey"
                    params={{ deviceKey: device.deviceKey }}
                    className="text-[var(--pc-text-muted)] hover:text-[var(--pc-text)]"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
