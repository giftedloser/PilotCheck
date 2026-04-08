import { Link } from "@tanstack/react-router";
import { ChevronRight, Maximize2, Monitor } from "lucide-react";

import type { ProfileAuditSummary } from "../../lib/types.js";
import { SourceBadge } from "../shared/SourceBadge.js";
import { Card } from "../ui/card.js";

function filterForProfile(profileName: string) {
  return {
    search: undefined,
    health: undefined,
    flag: undefined,
    property: undefined,
    profile: profileName,
    page: 1,
    pageSize: 25
  } as const;
}

export function ProfileCard({
  profile,
  onInspect
}: {
  profile: ProfileAuditSummary;
  onInspect?: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onInspect}
          disabled={!onInspect}
          className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default"
          title={onInspect ? "Open profile inspector" : undefined}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--pc-accent-muted)]">
            <Monitor className="h-4 w-4 text-[var(--pc-accent)]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className="truncate text-[14px] font-semibold text-white transition-colors group-hover:text-[var(--pc-accent-hover)]"
                title={profile.profileName}
              >
                {profile.profileName}
              </div>
              <SourceBadge source="intune" size="xs" />
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--pc-text-muted)]">
              Mode: {profile.deploymentMode ?? "Unknown"}
              {profile.hybridJoinConfigured ? " · Hybrid Join" : ""}
            </div>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {onInspect ? (
            <button
              type="button"
              onClick={onInspect}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-2 py-1 text-[11px] font-medium text-[var(--pc-text-secondary)] transition-colors hover:border-[var(--pc-accent)]/40 hover:text-white"
              title="Open profile inspector drawer"
            >
              <Maximize2 className="h-3 w-3" />
              Inspect
            </button>
          ) : null}
          <Link
            to="/devices"
            search={filterForProfile(profile.profileName)}
            className="inline-flex items-center gap-1 rounded-md bg-white/[0.05] px-2 py-1 text-[11px] font-medium tabular-nums text-[var(--pc-text-secondary)] transition-colors hover:bg-[var(--pc-accent-muted)] hover:text-[var(--pc-accent-hover)]"
            title="Show devices assigned to this profile"
          >
            {profile.assignedDevices} devices
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link
          to="/devices"
          search={filterForProfile(profile.profileName)}
          className="rounded-lg bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-white/[0.06]"
        >
          <div className="text-[11px] text-[var(--pc-text-muted)]">Target Groups</div>
          <div className="mt-1 text-[18px] font-semibold tabular-nums text-white">
            {profile.targetingGroups.length}
          </div>
        </Link>
        <Link
          to="/devices"
          search={{ ...filterForProfile(profile.profileName), flag: "no_profile_assigned" }}
          className="rounded-lg bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-[var(--pc-warning-muted)]"
          title="Show devices missing an assignment for this profile"
        >
          <div className="text-[11px] text-[var(--pc-text-muted)]">Missing Assignment</div>
          <div className="mt-1 text-[18px] font-semibold tabular-nums text-white">
            {profile.missingAssignmentCount}
          </div>
        </Link>
        <Link
          to="/devices"
          search={{ ...filterForProfile(profile.profileName), flag: "tag_mismatch" }}
          className="rounded-lg bg-white/[0.03] px-3 py-2.5 transition-colors hover:bg-[var(--pc-warning-muted)]"
          title="Show devices with a tag mismatch"
        >
          <div className="text-[11px] text-[var(--pc-text-muted)]">Tag Mismatch</div>
          <div className="mt-1 text-[18px] font-semibold tabular-nums text-white">
            {profile.tagMismatchCount}
          </div>
        </Link>
      </div>
    </Card>
  );
}
