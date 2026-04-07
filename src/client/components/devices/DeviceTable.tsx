import { Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight } from "lucide-react";
import { useEffect, useRef } from "react";

import type { DeviceListItem } from "../../lib/types.js";
import { cn } from "../../lib/utils.js";
import { FlagChip } from "../shared/FlagChip.js";
import { StatusBadge } from "../shared/StatusBadge.js";
import { Card } from "../ui/card.js";

export type DeviceTableDensity = "comfortable" | "compact";

interface DeviceTableProps {
  devices: DeviceListItem[];
  density?: DeviceTableDensity;
  selectedKeys?: Set<string>;
  onToggleSelected?: (deviceKey: string) => void;
  onToggleAll?: (deviceKeys: string[], allSelected: boolean) => void;
}

export function DeviceTable({
  devices,
  density = "comfortable",
  selectedKeys,
  onToggleSelected,
  onToggleAll
}: DeviceTableProps) {
  const navigate = useNavigate();
  const tableRef = useRef<HTMLTableElement>(null);
  const cellY = density === "compact" ? "py-1.5" : "py-3";
  const cellX = "px-4";
  const cell = cn(cellX, cellY);
  const selectionEnabled = Boolean(selectedKeys && onToggleSelected);

  // j/k row navigation, Enter to open. We rely on tabIndex={0} on each row
  // and let the browser track the focused element so it survives re-renders.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Don't hijack typing in inputs/textareas/contenteditables.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const table = tableRef.current;
      if (!table) return;
      const rows = Array.from(
        table.querySelectorAll<HTMLTableRowElement>("tbody tr[data-row-index]")
      );
      if (rows.length === 0) return;

      const activeIndex = rows.findIndex((row) => row === document.activeElement);

      if (event.key === "j" || event.key === "ArrowDown") {
        if (event.key === "ArrowDown" && activeIndex === -1) return;
        event.preventDefault();
        const next = activeIndex < 0 ? 0 : Math.min(activeIndex + 1, rows.length - 1);
        rows[next]?.focus();
      } else if (event.key === "k" || event.key === "ArrowUp") {
        if (event.key === "ArrowUp" && activeIndex === -1) return;
        event.preventDefault();
        const prev = activeIndex < 0 ? 0 : Math.max(activeIndex - 1, 0);
        rows[prev]?.focus();
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        const deviceKey = rows[activeIndex]?.dataset.deviceKey;
        if (deviceKey) {
          void navigate({ to: "/devices/$deviceKey", params: { deviceKey } });
        }
      } else if (event.key === " " && activeIndex >= 0 && selectionEnabled) {
        event.preventDefault();
        const deviceKey = rows[activeIndex]?.dataset.deviceKey;
        if (deviceKey) onToggleSelected?.(deviceKey);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, onToggleSelected, selectionEnabled]);

  if (devices.length === 0) {
    return (
      <Card className="px-5 py-10 text-center text-[13px] text-[var(--pc-text-muted)]">
        No devices match the current filters.
      </Card>
    );
  }

  const allSelectedOnPage =
    selectionEnabled &&
    devices.length > 0 &&
    devices.every((device) => selectedKeys!.has(device.deviceKey));

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table ref={tableRef} className="min-w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--pc-border)] text-[11px] font-medium text-[var(--pc-text-muted)]">
              {selectionEnabled && (
                <th className="w-8 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allSelectedOnPage}
                    onChange={() =>
                      onToggleAll?.(
                        devices.map((d) => d.deviceKey),
                        allSelectedOnPage
                      )
                    }
                    className="h-3.5 w-3.5 cursor-pointer accent-[var(--pc-accent)]"
                  />
                </th>
              )}
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
            {devices.map((device, index) => {
              const isSelected = selectionEnabled && selectedKeys!.has(device.deviceKey);
              return (
                <tr
                  key={device.deviceKey}
                  data-row-index={index}
                  data-device-key={device.deviceKey}
                  tabIndex={0}
                  className={cn(
                    "outline-none transition-colors hover:bg-white/[0.02]",
                    "focus:bg-[var(--pc-accent-muted)]/40 focus:ring-1 focus:ring-inset focus:ring-[var(--pc-accent)]/50",
                    isSelected && "bg-[var(--pc-accent-muted)]/30"
                  )}
                >
                  {selectionEnabled && (
                    <td className={cn("px-3", cellY)}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${device.deviceName ?? device.deviceKey}`}
                        checked={isSelected}
                        onChange={() => onToggleSelected?.(device.deviceKey)}
                        onClick={(event) => event.stopPropagation()}
                        className="h-3.5 w-3.5 cursor-pointer accent-[var(--pc-accent)]"
                      />
                    </td>
                  )}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
