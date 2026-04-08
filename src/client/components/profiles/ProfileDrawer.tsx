import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Layers,
  Monitor,
  ShieldCheck,
  Users,
  X
} from "lucide-react";

import type { HealthLevel } from "../../lib/types.js";
import { cn } from "../../lib/utils.js";
import { useProfileDetail } from "../../hooks/useProfiles.js";
import { LoadingState } from "../shared/ErrorState.js";
import { SourceBadge } from "../shared/SourceBadge.js";
import { StatusBadge } from "../shared/StatusBadge.js";

const HEALTH_ORDER: HealthLevel[] = ["critical", "warning", "info", "healthy", "unknown"];

const HEALTH_LABEL: Record<HealthLevel, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
  healthy: "Healthy",
  unknown: "Unknown"
};

const HEALTH_TONE: Record<HealthLevel, string> = {
  critical: "bg-[var(--pc-critical)]",
  warning: "bg-[var(--pc-warning)]",
  info: "bg-[var(--pc-info)]",
  healthy: "bg-[var(--pc-healthy)]",
  unknown: "bg-white/20"
};

function filterForProfile(profileName: string, health?: HealthLevel) {
  return {
    search: undefined,
    health,
    flag: undefined,
    property: undefined,
    profile: profileName,
    page: 1,
    pageSize: 25
  } as const;
}

export function ProfileDrawer({
  profileId,
  onClose
}: {
  profileId: string | null;
  onClose: () => void;
}) {
  const detail = useProfileDetail(profileId ?? undefined);

  // Esc to close, lock body scroll while open.
  useEffect(() => {
    if (!profileId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [profileId, onClose]);

  if (!profileId) return null;

  const data = detail.data;
  const total = data
    ? HEALTH_ORDER.reduce((sum, key) => sum + (data.counts[key] ?? 0), 0)
    : 0;

  return (
    <div
      className="pc-overlay-enter fixed inset-0 z-[55] flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Profile detail"
    >
      <div
        className="pc-drawer-enter flex h-full w-full max-w-[640px] flex-col border-l border-[var(--pc-border)] bg-[var(--pc-surface)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--pc-border)] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--pc-accent-muted)]">
              <Monitor className="h-4 w-4 text-[var(--pc-accent)]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="truncate text-[15px] font-semibold text-white"
                  title={data?.profileName ?? ""}
                >
                  {data?.profileName ?? "Loading…"}
                </div>
                <SourceBadge source="intune" size="xs" />
              </div>
              <div className="mt-0.5 text-[12px] text-[var(--pc-text-muted)]">
                Mode: {data?.deploymentMode ?? "Unknown"}
                {data?.hybridJoinConfigured ? " · Hybrid Join" : ""}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--pc-text-muted)] transition-colors hover:text-[var(--pc-text)]"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {!data ? (
          <div className="flex flex-1 items-center justify-center">
            <LoadingState label="Loading profile…" />
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {/* Health distribution bar */}
            <section>
              <SectionHeader icon={ShieldCheck} title="Health distribution">
                <Link
                  to="/devices"
                  search={filterForProfile(data.profileName)}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--pc-accent)] hover:text-[var(--pc-accent-hover)]"
                >
                  View all {total}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </SectionHeader>
              {total === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--pc-border)] px-3 py-4 text-center text-[12px] text-[var(--pc-text-muted)]">
                  No devices currently target this profile.
                </div>
              ) : (
                <>
                  <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.04]">
                    {HEALTH_ORDER.map((key) => {
                      const count = data.counts[key] ?? 0;
                      if (count === 0) return null;
                      const pct = (count / total) * 100;
                      return (
                        <div
                          key={key}
                          className={HEALTH_TONE[key]}
                          style={{ width: `${pct}%` }}
                          title={`${HEALTH_LABEL[key]}: ${count}`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {HEALTH_ORDER.map((key) => {
                      const count = data.counts[key] ?? 0;
                      if (count === 0 && key !== "healthy") return null;
                      return (
                        <Link
                          key={key}
                          to="/devices"
                          search={filterForProfile(data.profileName, key)}
                          onClick={onClose}
                          className="flex items-center justify-between gap-2 rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-2.5 py-1.5 text-[11.5px] transition-colors hover:border-[var(--pc-accent)]/40"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className={cn("h-2 w-2 rounded-full", HEALTH_TONE[key])} />
                            <span className="text-[var(--pc-text-secondary)]">
                              {HEALTH_LABEL[key]}
                            </span>
                          </span>
                          <span className="font-semibold tabular-nums text-white">{count}</span>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            {/* Targeting groups */}
            <section>
              <SectionHeader icon={Users} title="Targeting groups">
                <span className="text-[11px] text-[var(--pc-text-muted)]">
                  ({data.targetingGroups.length})
                </span>
              </SectionHeader>
              {data.targetingGroups.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--pc-border)] px-3 py-4 text-center text-[12px] text-[var(--pc-text-muted)]">
                  No groups target this profile. Devices will not receive it.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {data.targetingGroups.map((group) => (
                    <li
                      key={group.groupId}
                      className="flex items-start justify-between gap-3 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[12.5px] font-medium text-white">
                          {group.groupName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-[var(--pc-text-muted)]">
                          <span className="capitalize">{group.membershipType}</span>
                          <span>·</span>
                          <span>{group.memberCount} members</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* OOBE summary */}
            {data.oobeSummary.length > 0 && (
              <section>
                <SectionHeader icon={Layers} title="OOBE configuration" />
                <ul className="space-y-1">
                  {data.oobeSummary.map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-2 text-[11.5px] text-[var(--pc-text-secondary)]"
                    >
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[var(--pc-healthy)]" />
                      {line}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Quick problem links */}
            <section>
              <SectionHeader icon={AlertTriangle} title="Common problems" />
              <div className="grid gap-2 sm:grid-cols-2">
                <Link
                  to="/devices"
                  search={{
                    ...filterForProfile(data.profileName),
                    flag: "no_profile_assigned"
                  }}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-3 py-2 transition-colors hover:border-[var(--pc-warning)]/40"
                >
                  <span className="text-[11.5px] text-[var(--pc-text-secondary)]">
                    Missing assignment
                  </span>
                  <span className="font-semibold tabular-nums text-white">
                    {data.missingAssignmentCount}
                  </span>
                </Link>
                <Link
                  to="/devices"
                  search={{
                    ...filterForProfile(data.profileName),
                    flag: "tag_mismatch"
                  }}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-3 py-2 transition-colors hover:border-[var(--pc-warning)]/40"
                >
                  <span className="text-[11.5px] text-[var(--pc-text-secondary)]">
                    Tag mismatch
                  </span>
                  <span className="font-semibold tabular-nums text-white">
                    {data.tagMismatchCount}
                  </span>
                </Link>
              </div>
            </section>

            {/* Device breakdown */}
            <section>
              <SectionHeader icon={Monitor} title="Devices">
                <span className="text-[11px] text-[var(--pc-text-muted)]">
                  ({data.deviceBreakdown.length})
                </span>
              </SectionHeader>
              {data.deviceBreakdown.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--pc-border)] px-3 py-4 text-center text-[12px] text-[var(--pc-text-muted)]">
                  No devices assigned to this profile yet.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-[var(--pc-border)]">
                  <table className="w-full">
                    <thead className="bg-[var(--pc-surface-raised)]">
                      <tr className="text-[10px] uppercase tracking-wide text-[var(--pc-text-muted)]">
                        <th className="px-3 py-2 text-left font-medium">Device</th>
                        <th className="px-3 py-2 text-left font-medium">Property</th>
                        <th className="px-3 py-2 text-left font-medium">Health</th>
                        <th className="px-3 py-2 text-right font-medium">Flags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--pc-border)]">
                      {data.deviceBreakdown.slice(0, 25).map((device) => (
                        <tr
                          key={device.deviceKey}
                          className="transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-3 py-2 text-[12px]">
                            <Link
                              to="/devices/$deviceKey"
                              params={{ deviceKey: device.deviceKey }}
                              onClick={onClose}
                              className="font-medium text-white hover:text-[var(--pc-accent-hover)]"
                            >
                              {device.deviceName ?? device.serialNumber ?? "—"}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-[11.5px] text-[var(--pc-text-secondary)]">
                            {device.propertyLabel ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge health={device.health} />
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-[11.5px] text-[var(--pc-text-secondary)]">
                            {device.flagCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.deviceBreakdown.length > 25 ? (
                    <Link
                      to="/devices"
                      search={filterForProfile(data.profileName)}
                      onClick={onClose}
                      className="block border-t border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-3 py-2 text-center text-[11px] text-[var(--pc-accent)] hover:text-[var(--pc-accent-hover)]"
                    >
                      View all {data.deviceBreakdown.length} devices →
                    </Link>
                  ) : null}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  children
}: {
  icon: typeof Monitor;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-[var(--pc-accent)]" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--pc-text-secondary)]">
        {title}
      </span>
      {children ? <div className="ml-auto">{children}</div> : null}
    </div>
  );
}
