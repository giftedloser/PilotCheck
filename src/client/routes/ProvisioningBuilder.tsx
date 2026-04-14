import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Copy,
  GitBranch,
  Loader2,
  Rows3,
  Search,
  ShieldCheck,
  StretchHorizontal,
  Tag,
  Users,
  XCircle
} from "lucide-react";

import { PageHeader } from "../components/layout/PageHeader.js";
import { ErrorState, LoadingState } from "../components/shared/ErrorState.js";
import { SourceBadge } from "../components/shared/SourceBadge.js";
import { useToast } from "../components/shared/toast.js";
import { Button } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { apiRequest } from "../lib/api.js";
import { cn } from "../lib/utils.js";

interface DiscoverResult {
  groupTag: string;
  deviceCount: number;
  matchingGroups: Array<{
    groupId: string;
    groupName: string;
    membershipRule: string | null;
    membershipType: string;
  }>;
  matchingProfiles: Array<{
    profileId: string;
    profileName: string;
    deploymentMode: string | null;
    viaGroupId: string;
  }>;
  existingConfig: {
    groupTag: string;
    propertyLabel: string;
    expectedProfileNames: string[];
    expectedGroupNames: string[];
  } | null;
}

interface ValidateResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const operatorChecklist = [
  "Search the exact Autopilot group tag in use on the device record.",
  "Confirm the targeting group references the same operational tag.",
  "Validate that the assigned deployment profile matches the intended lane."
];

export function ProvisioningBuilderPage() {
  const toast = useToast();
  const [groupTag, setGroupTag] = useState("");
  const [searchTag, setSearchTag] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  const discover = useQuery({
    queryKey: ["provisioning-discover", searchTag],
    queryFn: () =>
      apiRequest<DiscoverResult>(
        `/api/provisioning/discover?groupTag=${encodeURIComponent(searchTag)}`
      ),
    enabled: searchTag.length > 0
  });

  const validate = useMutation({
    mutationFn: (payload: {
      groupTag: string;
      groupId: string | null;
      profileId: string | null;
    }) =>
      apiRequest<ValidateResult>("/api/provisioning/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
  });

  const handleDiscover = () => {
    if (groupTag.trim()) {
      setSearchTag(groupTag.trim());
      setSelectedGroupId(null);
      setSelectedProfileId(null);
      validate.reset();
    }
  };

  const handleValidate = () => {
    validate.mutate({
      groupTag: searchTag,
      groupId: selectedGroupId,
      profileId: selectedProfileId
    });
  };

  const data = discover.data;
  const selectedGroup =
    data?.matchingGroups.find((group) => group.groupId === selectedGroupId) ?? null;
  const selectedProfile =
    data?.matchingProfiles.find((profile) => profile.profileId === selectedProfileId) ?? null;
  const selectedProfileViaGroup =
    selectedProfile &&
    data?.matchingGroups.find((group) => group.groupId === selectedProfile.viaGroupId);
  const expectedGroups = data?.existingConfig?.expectedGroupNames ?? [];
  const expectedProfiles = data?.existingConfig?.expectedProfileNames ?? [];
  const isSelectedGroupExpected = selectedGroup
    ? expectedGroups.includes(selectedGroup.groupName)
    : null;
  const isSelectedProfileExpected = selectedProfile
    ? expectedProfiles.includes(selectedProfile.profileName)
    : null;

  const handleCopy = async (label: string, value: string | null | undefined) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.push({
        variant: "success",
        title: `${label} copied`,
        description: `${label} copied to clipboard for ticketing or chat.`
      });
    } catch {
      toast.push({
        variant: "error",
        title: "Copy failed",
        description: `Could not copy ${label.toLowerCase()} to clipboard.`
      });
    }
  };

  const handleExportSummary = async () => {
    const lines = [
      `PilotCheck Provisioning Review — ${new Date().toLocaleString()}`,
      `${"─".repeat(56)}`,
      `Group Tag:          ${data?.groupTag ?? "Not loaded"}`,
      `Devices with tag:   ${data?.deviceCount ?? "—"}`,
      ``,
      `Selected Group:     ${selectedGroup?.groupName ?? "None"}`,
      `  Membership type:  ${selectedGroup ? formatMembershipType(selectedGroup.membershipType) : "—"}`,
      `  Group ID:         ${selectedGroup?.groupId ?? "—"}`,
      ``,
      `Selected Profile:   ${selectedProfile?.profileName ?? "None"}`,
      `  Deployment mode:  ${selectedProfile ? formatDeploymentMode(selectedProfile.deploymentMode) : "—"}`,
      `  Profile ID:       ${selectedProfile?.profileId ?? "—"}`,
      `  Assigned via:     ${selectedProfileViaGroup?.groupName ?? selectedProfile?.viaGroupId ?? "—"}`,
      ``
    ];
    if (validate.data) {
      lines.push(`Validation:         ${validate.data.valid ? "PASS" : "FAIL"}`);
      for (const e of validate.data.errors) lines.push(`  ERROR: ${e}`);
      for (const w of validate.data.warnings) lines.push(`  WARN:  ${w}`);
    } else {
      lines.push(`Validation:         Not run`);
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.push({ variant: "success", title: "Summary copied", description: "Paste into a ticket or change request." });
    } catch {
      toast.push({ variant: "error", title: "Copy failed", description: "Could not write to clipboard." });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inspect"
        title="Provisioning Builder"
        description="Trace an Autopilot provisioning path from group tag through Entra targeting and profile assignment. Use this to verify whether a new tag chain looks operationally sound before you rely on it in production."
        actions={
          <>
            <SourceBadge source="autopilot" />
            <SourceBadge source="entra" />
            <SourceBadge source="derived" />
            <button
              type="button"
              onClick={() => setCompact((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--pc-text-secondary)] transition-colors hover:border-[var(--pc-border-hover)] hover:text-white"
              title={compact ? "Switch to comfortable view" : "Switch to compact view"}
            >
              {compact ? <StretchHorizontal className="h-3 w-3" /> : <Rows3 className="h-3 w-3" />}
              {compact ? "Comfortable" : "Compact"}
            </button>
            {data ? (
              <button
                type="button"
                onClick={() => void handleExportSummary()}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--pc-text-secondary)] transition-colors hover:border-[var(--pc-border-hover)] hover:text-white"
                title="Copy operator summary to clipboard"
              >
                <ClipboardCopy className="h-3 w-3" />
                Export Summary
              </button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <div className="space-y-5">
          <Card className="overflow-hidden border-[var(--pc-border-hover)]">
            <div className="border-b border-[var(--pc-border)] bg-[linear-gradient(135deg,rgba(99,102,241,0.18),rgba(19,22,30,0.88)_55%)] px-5 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--pc-accent-hover)]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Workflow
                  </div>
                  <div className="text-xl font-semibold tracking-tight text-white">
                    Validate a tag-to-profile provisioning path
                  </div>
                  <div className="mt-1 text-[13px] leading-relaxed text-[var(--pc-text-secondary)]">
                    Search by operational tag, inspect discovered targets, then validate the
                    selected chain. This view is tuned for fast admin review, not authoring.
                  </div>
                </div>

                <div className="grid gap-2 text-[11.5px] text-[var(--pc-text-secondary)] sm:grid-cols-3">
                  {operatorChecklist.map((item, index) => (
                    <div
                      key={item}
                      className="rounded-lg border border-white/8 bg-black/15 px-3 py-2"
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--pc-accent-hover)]">
                        Step {index + 1}
                      </div>
                      <div className="mt-1 leading-snug">{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                  <Tag className="h-3.5 w-3.5" />
                  Tag Search
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--pc-text-muted)]" />
                    <Input
                      value={groupTag}
                      onChange={(event) => setGroupTag(event.target.value)}
                      onKeyDown={(event) =>
                        event.key === "Enter" && handleDiscover()
                      }
                      placeholder="Enter group tag, for example Lodge, BHK, or Kiosk"
                      className="h-10 pl-8"
                    />
                  </div>
                  <Button
                    onClick={handleDiscover}
                    disabled={!groupTag.trim() || discover.isFetching}
                    className="h-10 min-w-[132px]"
                  >
                    {discover.isFetching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    Discover
                  </Button>
                </div>
                <div className="mt-2 text-[11.5px] text-[var(--pc-text-muted)]">
                  Searches current synced Autopilot, Entra group, and profile assignment data.
                </div>
              </div>

              <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/65 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                      Search Context
                    </div>
                    <div className="mt-2 text-[20px] font-semibold text-white">
                      {searchTag || "No tag loaded"}
                    </div>
                  </div>
                  {searchTag ? (
                    <IconButton
                      label="Copy tag"
                      onClick={() => void handleCopy("Group tag", searchTag)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </IconButton>
                  ) : null}
                </div>
                <div className="mt-1 text-[12px] text-[var(--pc-text-secondary)]">
                  {searchTag
                    ? "Current working tag used for discovery and validation."
                    : "Load a tag to populate targeting candidates and current chain details."}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Devices With Tag"
              value={data ? String(data.deviceCount) : "—"}
              tone="neutral"
              hint="Autopilot records carrying the searched tag."
            />
            <MetricCard
              label="Matching Groups"
              value={data ? String(data.matchingGroups.length) : "—"}
              tone={data && data.matchingGroups.length > 0 ? "healthy" : "warning"}
              hint="Discovered Entra groups referencing the tag."
            />
            <MetricCard
              label="Matching Profiles"
              value={data ? String(data.matchingProfiles.length) : "—"}
              tone={data && data.matchingProfiles.length > 0 ? "healthy" : "warning"}
              hint="Deployment profiles assigned through those groups."
            />
          </div>

          {data && data.deviceCount === 0 && data.matchingGroups.length === 0 ? (
            <Card className="border-dashed px-5 py-6 text-center">
              <div className="text-[13px] font-semibold text-[var(--pc-text-secondary)]">
                No devices or groups match this tag
              </div>
              <div className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-[var(--pc-text-muted)]">
                Check the tag spelling matches your Autopilot hardware order ID. If the tag is new,
                devices may not have synced yet — run a sync from the Sync page and try again.
              </div>
            </Card>
          ) : null}

          {discover.isError ? (
            <ErrorState
              title="Discovery failed"
              error={discover.error}
              onRetry={() => discover.refetch()}
            />
          ) : null}

          {discover.isFetching && !data ? (
            <Card className="p-5">
              <LoadingState label="Discovering provisioning targets..." />
            </Card>
          ) : null}

          {data ? (
            <>
              {data.existingConfig ? (
                <Card className="overflow-hidden">
                  <div className="border-b border-[var(--pc-border)] px-5 py-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--pc-info)]" />
                      <div className="text-[13px] font-semibold text-white">
                        Existing Configuration Reference
                      </div>
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--pc-text-secondary)]">
                      Stored expectations from `tag_config` for this operational tag.
                    </div>
                  </div>
                  <div className="grid gap-4 px-5 py-5 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)]">
                    <SummaryBlock
                      label="Property"
                      value={data.existingConfig.propertyLabel}
                      hint={`Tag ${data.existingConfig.groupTag}`}
                    />
                    <ChipList
                      title="Expected Groups"
                      items={data.existingConfig.expectedGroupNames}
                      emptyLabel="No expected groups configured."
                    />
                    <ChipList
                      title="Expected Profiles"
                      items={data.existingConfig.expectedProfileNames}
                      emptyLabel="No expected profiles configured."
                    />
                  </div>
                </Card>
              ) : null}

              <div className="grid gap-5 2xl:grid-cols-2">
                <Card className="overflow-hidden">
                  <div className="border-b border-[var(--pc-border)] px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[var(--pc-accent)]" />
                          <div className="text-[13px] font-semibold text-white">
                            Target Groups
                          </div>
                        </div>
                        <div className="mt-1 text-[12px] text-[var(--pc-text-secondary)]">
                          Review the group that should receive devices carrying this tag.
                        </div>
                      </div>
                      <CountPill value={data.matchingGroups.length} label="found" />
                    </div>
                  </div>

                  {data.matchingGroups.length === 0 ? (
                    <EmptyPanel
                      message={`No groups found referencing "${data.groupTag}".`}
                      guidance="Check that an Entra group exists with a dynamic membership rule containing this tag value, or that a group display name includes the tag string."
                    />
                  ) : (
                    <div className="max-h-[520px] space-y-2 overflow-auto px-3 py-3">
                      <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-2 border-b border-[var(--pc-border)] bg-[var(--pc-surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                        {data.matchingGroups.length} group{data.matchingGroups.length !== 1 ? "s" : ""} — click to select
                      </div>
                      {data.matchingGroups.map((group) => (
                        <button
                          key={group.groupId}
                          type="button"
                          onClick={() =>
                            setSelectedGroupId(
                              group.groupId === selectedGroupId ? null : group.groupId
                            )
                          }
                          className={cn(
                            "w-full rounded-xl border text-left transition-colors",
                            compact ? "px-3 py-2" : "px-4 py-3",
                            selectedGroupId === group.groupId
                              ? "border-[var(--pc-accent)] bg-[var(--pc-accent-muted)]"
                              : "border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55 hover:border-[var(--pc-border-hover)] hover:bg-[var(--pc-surface-raised)]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className={cn("font-medium text-white", compact ? "text-[12px]" : "text-[13px]")}>
                                {group.groupName}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] uppercase tracking-wide text-[var(--pc-text-muted)]">
                                <span>{formatMembershipType(group.membershipType)}</span>
                                <span>•</span>
                                <span>{selectedGroupId === group.groupId ? "Selected" : "Available"}</span>
                                {expectedGroups.includes(group.groupName) ? (
                                  <>
                                    <span>•</span>
                                    <span className="text-[var(--pc-healthy)]">Expected</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <SelectionBadge active={selectedGroupId === group.groupId} />
                          </div>
                          {!compact && (
                            <div className="mt-3 rounded-lg border border-white/6 bg-black/10 px-3 py-2">
                              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                                Membership Rule
                              </div>
                              <div className="font-mono text-[11px] leading-relaxed text-[var(--pc-text-secondary)]">
                                {group.membershipRule ?? "No dynamic rule stored for this group."}
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="overflow-hidden">
                  <div className="border-b border-[var(--pc-border)] px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-[var(--pc-accent)]" />
                          <div className="text-[13px] font-semibold text-white">
                            Deployment Profiles
                          </div>
                        </div>
                        <div className="mt-1 text-[12px] text-[var(--pc-text-secondary)]">
                          Confirm which profile is reachable from the discovered group path.
                        </div>
                      </div>
                      <CountPill value={data.matchingProfiles.length} label="found" />
                    </div>
                  </div>

                  {data.matchingProfiles.length === 0 ? (
                    <EmptyPanel
                      message="No deployment profiles are assigned to the discovered groups."
                      guidance={
                        data.matchingGroups.length > 0
                          ? "Groups were found, but none have an Autopilot deployment profile assigned. Assign a profile to one of the discovered groups in the Intune portal."
                          : "Discover matching groups first — profiles are found through group→profile assignments."
                      }
                    />
                  ) : (
                    <div className="max-h-[520px] space-y-2 overflow-auto px-3 py-3">
                      <div className="sticky top-0 z-10 -mx-3 -mt-3 mb-2 border-b border-[var(--pc-border)] bg-[var(--pc-surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                        {data.matchingProfiles.length} profile{data.matchingProfiles.length !== 1 ? "s" : ""} — click to select
                      </div>
                      {data.matchingProfiles.map((profile) => {
                        const viaGroup =
                          data.matchingGroups.find(
                            (group) => group.groupId === profile.viaGroupId
                          )?.groupName ?? profile.viaGroupId;

                        return (
                          <button
                            key={`${profile.profileId}-${profile.viaGroupId}`}
                            type="button"
                            onClick={() =>
                              setSelectedProfileId(
                                profile.profileId === selectedProfileId
                                  ? null
                                  : profile.profileId
                              )
                            }
                            className={cn(
                              "w-full rounded-xl border text-left transition-colors",
                              compact ? "px-3 py-2" : "px-4 py-3",
                              selectedProfileId === profile.profileId
                                ? "border-[var(--pc-accent)] bg-[var(--pc-accent-muted)]"
                                : "border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55 hover:border-[var(--pc-border-hover)] hover:bg-[var(--pc-surface-raised)]"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className={cn("font-medium text-white", compact ? "text-[12px]" : "text-[13px]")}>
                                  {profile.profileName}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--pc-text-secondary)]">
                                  <span>
                                    Assigned via{" "}
                                    <span className="text-[var(--pc-text)]">{viaGroup}</span>
                                  </span>
                                  {expectedProfiles.includes(profile.profileName) ? (
                                    <span className="rounded-full bg-[var(--pc-healthy-muted)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--pc-healthy)]">
                                      Expected
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {profile.deploymentMode ? (
                                  <span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10.5px] font-medium text-[var(--pc-text-secondary)]">
                                    {formatDeploymentMode(profile.deploymentMode)}
                                  </span>
                                ) : null}
                                <SelectionBadge active={selectedProfileId === profile.profileId} />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--pc-border)] px-5 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--pc-accent)]" />
                <div className="text-[13px] font-semibold text-white">
                  Operational Readiness
                </div>
              </div>
              <div className="mt-1 text-[12px] text-[var(--pc-text-secondary)]">
                Windows operator checklist for whether this path is ready for review.
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <StatusRow
                label="Tag loaded"
                status={Boolean(data)}
                helper={
                  data
                    ? `Working tag: ${data.groupTag}`
                    : "Run discovery to pull the current tag context."
                }
              />
              <StatusRow
                label="Target group selected"
                status={Boolean(selectedGroup)}
                helper={
                  selectedGroup
                    ? selectedGroup.groupName
                    : "Select the Entra group that should receive the tag."
                }
              />
              <StatusRow
                label="Deployment profile selected"
                status={Boolean(selectedProfile)}
                helper={
                  selectedProfile
                    ? selectedProfile.profileName
                    : "Select the Windows Autopilot profile for this path."
                }
              />
              <StatusRow
                label="Stored config reference"
                status={Boolean(data?.existingConfig)}
                helper={
                  data?.existingConfig
                    ? data.existingConfig.propertyLabel
                    : "No tag_config reference stored for this tag."
                }
                tone="info"
              />

              <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55 p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                  Expected Config Alignment
                </div>
                <CompareRow
                  label="Selected group"
                  state={isSelectedGroupExpected}
                  emptyLabel="Select a group to compare it against tag_config."
                />
                <CompareRow
                  label="Selected profile"
                  state={isSelectedProfileExpected}
                  emptyLabel="Select a profile to compare it against tag_config."
                />
                <div className="mt-3 rounded-lg border border-white/6 bg-black/10 px-3 py-2 text-[11px] leading-relaxed text-[var(--pc-text-secondary)]">
                  Stored expectations are advisory reference values from `tag_config`. They help
                  Windows admins spot drift before validating the chain.
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-[var(--pc-border)] px-5 py-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--pc-accent)]" />
                <div className="text-[13px] font-semibold text-white">
                  Current Chain Review
                </div>
              </div>
              <div className="mt-1 text-[12px] text-[var(--pc-text-secondary)]">
                Operator summary of the tag, target group, and selected deployment profile.
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <SelectionSummary
                icon={<Tag className="h-3.5 w-3.5" />}
                label="Group Tag"
                value={data?.groupTag ?? "No tag loaded"}
                helper={
                  data
                    ? `${data.deviceCount} device records currently match.`
                    : "Run discovery to load a tag context."
                }
                detailRows={
                  data
                    ? [
                        { label: "Operational use", value: "Windows Autopilot group tag" },
                        { label: "Current value", value: data.groupTag }
                      ]
                    : []
                }
                onCopy={data ? () => void handleCopy("Group tag", data.groupTag) : undefined}
              />
              <SelectionSummary
                icon={<Users className="h-3.5 w-3.5" />}
                label="Target Group"
                value={selectedGroup?.groupName ?? "No group selected"}
                helper={
                  selectedGroup
                    ? formatMembershipType(selectedGroup.membershipType)
                    : "Choose the group that should receive this tag."
                }
                detailRows={
                  selectedGroup
                    ? [
                        { label: "Membership type", value: formatMembershipType(selectedGroup.membershipType) },
                        { label: "Group ID", value: selectedGroup.groupId },
                        {
                          label: "Expected config",
                          value:
                            isSelectedGroupExpected === null
                              ? "Not checked"
                              : isSelectedGroupExpected
                                ? "Matches stored expected group"
                                : "Not listed in stored expected groups"
                        }
                      ]
                    : []
                }
                onCopy={
                  selectedGroup
                    ? () => void handleCopy("Group ID", selectedGroup.groupId)
                    : undefined
                }
              />
              <SelectionSummary
                icon={<GitBranch className="h-3.5 w-3.5" />}
                label="Deployment Profile"
                value={selectedProfile?.profileName ?? "No profile selected"}
                helper={
                  selectedProfile?.deploymentMode
                    ? formatDeploymentMode(selectedProfile.deploymentMode)
                    :
                  "Choose the profile expected to land on devices in this path."
                }
                detailRows={
                  selectedProfile
                    ? [
                        {
                          label: "Deployment mode",
                          value: formatDeploymentMode(selectedProfile.deploymentMode)
                        },
                        {
                          label: "Assigned via",
                          value: selectedProfileViaGroup?.groupName ?? selectedProfile.viaGroupId
                        },
                        { label: "Profile ID", value: selectedProfile.profileId },
                        {
                          label: "Expected config",
                          value:
                            isSelectedProfileExpected === null
                              ? "Not checked"
                              : isSelectedProfileExpected
                                ? "Matches stored expected profile"
                                : "Not listed in stored expected profiles"
                        }
                      ]
                    : []
                }
                onCopy={
                  selectedProfile
                    ? () => void handleCopy("Profile ID", selectedProfile.profileId)
                    : undefined
                }
              />

              <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/65 p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
                  Validation Action
                </div>
                <Button
                  onClick={handleValidate}
                  disabled={validate.isPending}
                  className="h-10 w-full"
                >
                  {validate.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Validating
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Validate Chain
                    </>
                  )}
                </Button>
                <div className="mt-2 text-[11.5px] leading-relaxed text-[var(--pc-text-muted)]">
                  Uses the current tag, selected group, and selected profile exactly as shown
                  above.
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-[var(--pc-border)] px-5 py-4">
              <div className="text-[13px] font-semibold text-white">Validation Output</div>
              <div className="mt-1 text-[12px] text-[var(--pc-text-secondary)]">
                Review errors and warnings before treating the chain as production-ready.
              </div>
            </div>

            <div className="space-y-3 px-5 py-5">
              {!validate.data ? (
                <div className="rounded-xl border border-dashed border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/35 px-4 py-5 text-[12px] leading-relaxed text-[var(--pc-text-muted)]">
                  No validation has been run yet. Execute the chain review once you have loaded a
                  tag and inspected the discovered targets.
                </div>
              ) : (
                <>
                  <ResultBanner valid={validate.data.valid} />
                  {validate.data.errors.length > 0 ? (
                    <IssueList
                      title="Errors"
                      items={validate.data.errors}
                      tone="critical"
                    />
                  ) : null}
                  {validate.data.warnings.length > 0 ? (
                    <IssueList
                      title="Warnings"
                      items={validate.data.warnings}
                      tone="warning"
                    />
                  ) : null}
                  {validate.data.errors.length === 0 &&
                  validate.data.warnings.length === 0 ? (
                    <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55 px-4 py-4 text-[12px] text-[var(--pc-text-secondary)]">
                      No warnings were returned for the current validation response.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone
}: {
  label: string;
  value: string;
  hint: string;
  tone: "neutral" | "healthy" | "warning";
}) {
  const toneClass =
    tone === "healthy"
      ? "border-[var(--pc-healthy)]/25 bg-[var(--pc-healthy-muted)]/55"
      : tone === "warning"
        ? "border-[var(--pc-warning)]/25 bg-[var(--pc-warning-muted)]/55"
        : "border-[var(--pc-border)] bg-[var(--pc-surface)]";

  return (
    <Card className={cn("p-4", toneClass)}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-[28px] font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-[11.5px] leading-relaxed text-[var(--pc-text-secondary)]">
        {hint}
      </div>
    </Card>
  );
}

function SummaryBlock({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55 p-4">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-[15px] font-semibold text-white">{value}</div>
      <div className="mt-1 text-[11.5px] text-[var(--pc-text-secondary)]">{hint}</div>
    </div>
  );
}

function ChipList({
  title,
  items,
  emptyLabel
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55 p-4">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
        {title}
      </div>
      {items.length === 0 ? (
        <div className="mt-2 text-[11.5px] text-[var(--pc-text-secondary)]">{emptyLabel}</div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-md border border-white/8 bg-black/12 px-2 py-1 text-[11px] text-[var(--pc-text)]"
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CountPill({ value, label }: { value: number; label: string }) {
  return (
    <span className="rounded-full border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-wide text-[var(--pc-text-secondary)]">
      {value} {label}
    </span>
  );
}

function IconButton({
  children,
  label,
  onClick
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] text-[var(--pc-text-secondary)] transition-colors hover:border-[var(--pc-border-hover)] hover:text-white"
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

function SelectionBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        active
          ? "bg-[var(--pc-accent)] text-white"
          : "bg-white/[0.06] text-[var(--pc-text-muted)]"
      )}
    >
      {active ? "Selected" : "Pick"}
    </span>
  );
}

function EmptyPanel({ message, guidance }: { message: string; guidance?: string }) {
  return (
    <div className="px-5 py-8">
      <div className="text-[12px] leading-relaxed text-[var(--pc-text-muted)]">
        {message}
      </div>
      {guidance ? (
        <div className="mt-3 rounded-lg border border-dashed border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/35 px-3 py-2.5 text-[11px] leading-relaxed text-[var(--pc-text-muted)]">
          {guidance}
        </div>
      ) : null}
    </div>
  );
}

function SelectionSummary({
  icon,
  label,
  value,
  helper,
  detailRows = [],
  onCopy
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  detailRows?: Array<{ label: string; value: string }>;
  onCopy?: () => void;
}) {
  return (
    <div className="rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
          <span className="text-[var(--pc-accent)]">{icon}</span>
          {label}
        </div>
        {onCopy ? (
          <IconButton label={`Copy ${label.toLowerCase()}`} onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" />
          </IconButton>
        ) : null}
      </div>
      <div className="mt-2 text-[14px] font-semibold text-white">{value}</div>
      <div className="mt-1 text-[11.5px] leading-relaxed text-[var(--pc-text-secondary)]">
        {helper}
      </div>
      {detailRows.length > 0 ? (
        <div className="mt-3 space-y-2 rounded-lg border border-white/6 bg-black/10 px-3 py-2.5">
          {detailRows.map((row) => (
            <div
              key={`${label}-${row.label}`}
              className="flex items-start justify-between gap-3 text-[11px]"
            >
              <span className="text-[var(--pc-text-muted)]">{row.label}</span>
              <span className="max-w-[60%] text-right text-[var(--pc-text-secondary)]">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatusRow({
  label,
  status,
  helper,
  tone = "default"
}: {
  label: string;
  status: boolean;
  helper: string;
  tone?: "default" | "info";
}) {
  const activeClass =
    tone === "info"
      ? "border-[var(--pc-info)]/30 bg-[var(--pc-info-muted)]/55"
      : "border-[var(--pc-healthy)]/30 bg-[var(--pc-healthy-muted)]/55";

  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3",
        status
          ? activeClass
          : "border-[var(--pc-border)] bg-[var(--pc-surface-raised)]/55"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-semibold text-white">{label}</div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            status
              ? tone === "info"
                ? "bg-[var(--pc-info)]/18 text-sky-100"
                : "bg-[var(--pc-healthy)]/18 text-emerald-100"
              : "bg-white/[0.06] text-[var(--pc-text-muted)]"
          )}
        >
          {status ? "Ready" : "Pending"}
        </span>
      </div>
      <div className="mt-1 text-[11.5px] leading-relaxed text-[var(--pc-text-secondary)]">
        {helper}
      </div>
    </div>
  );
}

function CompareRow({
  label,
  state,
  emptyLabel
}: {
  label: string;
  state: boolean | null;
  emptyLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/6 py-2 last:border-b-0 last:pb-0">
      <div>
        <div className="text-[11.5px] font-medium text-white">{label}</div>
        <div className="mt-0.5 text-[11px] text-[var(--pc-text-secondary)]">
          {state === null
            ? emptyLabel
            : state
              ? "Matches the stored expected configuration."
              : "Does not match the stored expected configuration."}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          state === null
            ? "bg-white/[0.06] text-[var(--pc-text-muted)]"
            : state
              ? "bg-[var(--pc-healthy)]/18 text-emerald-100"
              : "bg-[var(--pc-warning)]/18 text-amber-100"
        )}
      >
        {state === null ? "Open" : state ? "Match" : "Review"}
      </span>
    </div>
  );
}

function ResultBanner({ valid }: { valid: boolean }) {
  return valid ? (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--pc-healthy)]/30 bg-[var(--pc-healthy-muted)] px-4 py-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pc-healthy)]" />
      <div>
        <div className="text-[12px] font-semibold text-emerald-100">
          Provisioning chain validated
        </div>
        <div className="mt-0.5 text-[11.5px] text-emerald-200/85">
          The current response did not return blocking validation errors.
        </div>
      </div>
    </div>
  ) : (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--pc-critical)]/30 bg-[var(--pc-critical-muted)] px-4 py-3">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pc-critical)]" />
      <div>
        <div className="text-[12px] font-semibold text-red-100">
          Provisioning chain requires attention
        </div>
        <div className="mt-0.5 text-[11.5px] text-red-200/85">
          The selected chain returned one or more blocking errors.
        </div>
      </div>
    </div>
  );
}

function IssueList({
  title,
  items,
  tone
}: {
  title: string;
  items: string[];
  tone: "critical" | "warning";
}) {
  const icon =
    tone === "critical" ? (
      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--pc-critical)]" />
    ) : (
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--pc-warning)]" />
    );

  const classes =
    tone === "critical"
      ? "border-[var(--pc-critical)]/20 bg-[var(--pc-critical-muted)]/55"
      : "border-[var(--pc-warning)]/20 bg-[var(--pc-warning-muted)]/55";

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--pc-text-muted)]">
        {title}
      </div>
      {items.map((item, index) => (
        <div
          key={`${title}-${index}`}
          className={cn("flex items-start gap-2 rounded-xl border px-3 py-2.5", classes)}
        >
          {icon}
          <div className="text-[11.5px] leading-relaxed text-[var(--pc-text)]">{item}</div>
        </div>
      ))}
    </div>
  );
}

function formatMembershipType(value: string) {
  if (value === "DynamicMembership") return "Dynamic Membership";
  if (value === "Assigned") return "Assigned";
  return value;
}

function formatDeploymentMode(value: string | null) {
  if (!value) return "Unknown";
  if (value === "userDriven") return "User-driven";
  if (value === "selfDeploying") return "Self-deploying";
  if (value === "preProvisioning") return "Pre-provisioning";
  return value;
}
