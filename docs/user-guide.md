# Runway User Guide for Technicians

This guide is written for help desk, endpoint, and field technicians who use
Runway to triage Windows Autopilot, Intune, Entra ID, and ConfigMgr/SCCM
client-presence issues.

Runway is a local-first Windows triage console. It does not replace the Intune
admin center, the Entra admin center, or the Configuration Manager console.
Its job is to bring the common device-provisioning evidence into one focused
workflow so a technician can answer:

- Which Windows devices need attention?
- What part of the provisioning path is broken?
- What evidence supports that conclusion?
- What low-risk action or escalation should happen next?

## Table of contents

- [Who should use Runway](#who-should-use-runway)
- [What Runway can and cannot do](#what-runway-can-and-cannot-do)
- [Access and sign-in model](#access-and-sign-in-model)
- [Core concepts](#core-concepts)
- [Daily technician workflow](#daily-technician-workflow)
- [First-run and readiness checks](#first-run-and-readiness-checks)
- [Navigation overview](#navigation-overview)
- [Overview page](#overview-page)
- [Device Queue](#device-queue)
- [Device detail page](#device-detail-page)
- [Remote actions](#remote-actions)
- [LAPS and BitLocker retrieval](#laps-and-bitlocker-retrieval)
- [Profiles page](#profiles-page)
- [Groups page](#groups-page)
- [Provisioning Builder](#provisioning-builder)
- [Sync page](#sync-page)
- [Action Audit page](#action-audit-page)
- [Settings page](#settings-page)
- [Health flags and what to do](#health-flags-and-what-to-do)
- [Common triage playbooks](#common-triage-playbooks)
- [Escalation and handoff](#escalation-and-handoff)
- [Security and data handling](#security-and-data-handling)
- [Troubleshooting Runway itself](#troubleshooting-runway-itself)
- [Glossary](#glossary)

## Who should use Runway

Runway is for technicians who support Windows endpoint provisioning and device
health across Autopilot, Intune, and Entra ID. It is especially useful when a
device has records in more than one Microsoft system and the issue is not
obvious from a single console.

Good fit:

- Help desk technicians checking why a new Windows device did not complete
  provisioning.
- Endpoint admins reviewing unhealthy or stalled Autopilot devices.
- Field technicians validating whether a device belongs to the expected
  property, group, and deployment profile.
- Tier 2 support collecting evidence before changing group membership,
  deployment profile assignment, or device ownership.
- Admins reviewing what remote actions were attempted and who triggered them.

Poor fit:

- Non-Windows device management.
- Full Intune policy authoring.
- Full ConfigMgr client health analysis.
- Software update compliance reporting.
- Tenant-wide security investigation or Entra audit-log review.

## What Runway can and cannot do

Runway can:

- Correlate Windows device records across Autopilot, Intune, and Entra ID.
- Show whether Intune reports a ConfigMgr client through `managementAgent`.
- Identify missing records, weak joins, duplicate identity signals, assignment
  drift, profile issues, and stalled provisioning.
- Show device health buckets and source evidence in one place.
- Run delegated Intune actions such as sync, reboot, rename, rotate LAPS,
  Autopilot reset, retire, wipe, and record deletion.
- Retrieve LAPS passwords and BitLocker recovery keys when the signed-in admin
  has the required Microsoft Graph permissions.
- Export the current device page to CSV and export action audit logs.
- Store local device state and action history in a local SQLite database.

Runway cannot:

- Prove that a ConfigMgr client is healthy, assigned to the right site, pulling
  policy, or receiving updates. The v1 ConfigMgr signal is presence-only.
- Fix group membership, deployment profiles, or compliance policies by itself.
- Guarantee a remote action completed on the endpoint. It can show whether
  Graph accepted or rejected the request.
- Replace Microsoft support escalation for Graph or service-side failures.
- Validate live tenant accuracy without known-good devices for comparison.

## Access and sign-in model

Runway has two different access concepts. They are related, but not the same.

### App access gate

The app access gate controls whether a user can enter the Runway workspace at
all. When enabled, the technician must sign in with an Entra account from the
configured tenant before seeing fleet data.

If the app access gate is disabled, Runway still protects API routes locally.
There is no anonymous open API path for normal use.

### Delegated admin sign-in

Delegated admin sign-in is required for sensitive actions:

- Remote Intune actions.
- LAPS password retrieval.
- BitLocker recovery key retrieval.
- Viewing the Action Audit page.
- Changing tag mappings and some settings.

Reading dashboards and device state uses the configured app-only Graph
credentials. Taking action uses the signed-in delegated admin identity. This is
intentional: browsing device health and changing devices are separate trust
levels.

### Required behavior for technicians

- Sign in only with your own named admin account.
- Sign out when finished on a shared workstation.
- Do not share retrieved LAPS passwords or BitLocker keys outside the ticket,
  chat, or escalation path that requires them.
- Treat every destructive action confirmation as final.

## Core concepts

### Device identity correlation

A single physical device can appear in multiple Microsoft systems:

- Autopilot hardware record.
- Intune managed device.
- Entra device object.
- ConfigMgr client presence signal reported through Intune.

Runway joins those records using serial number, ZTDID, device IDs, and related
identity fields. A strong join means the records agree. A weak join, such as a
name-only match, means the technician should verify identity before acting.

### Health levels

Runway assigns device health from the worst active flag:

| Health | Meaning |
| --- | --- |
| Critical | Broken, conflicting, or likely requiring action. |
| Warning | Risky, drifting, or past an expected provisioning window. |
| Info | Notable but not necessarily broken by itself. |
| Healthy | No active flags. |
| Unknown | Not enough data exists yet to evaluate confidently. |

### Breakpoints

Runway groups diagnostic flags into four breakpoints:

| Breakpoint | What it answers |
| --- | --- |
| Identity | Is this the same device across Autopilot, Intune, and Entra? |
| Targeting | Is the device in the expected group and profile path? |
| Enrollment | Did the Autopilot and Intune provisioning path actually land? |
| Compliance & Drift | Did ownership, join, compliance, or rule state drift later? |

Use breakpoints before scrolling through raw data. They are the fastest way to
decide where to investigate.

### Tag mapping

The tag mapping dictionary tells Runway what a group tag is supposed to mean.
For each Autopilot group tag, it can store:

- Property label.
- Expected Autopilot deployment profile names.
- Expected target Entra group names.

Without tag mappings, Runway can still show source data, but it cannot reliably
judge `tag_mismatch` or `not_in_target_group`.

### Mock mode vs live data

Mock mode uses seeded demo data. It is useful for training and demos. Live data
uses the configured Microsoft Graph credentials.

Before making real operational decisions:

- Confirm the mock banner is gone.
- Confirm Graph is configured in Settings.
- Run a fresh sync.
- Validate several known devices against Microsoft admin centers.

## Daily technician workflow

Use this flow at the start of a support shift:

1. Open Runway.
2. Confirm whether you are in live mode or mock mode.
3. Open **Sync** and check the last successful sync.
4. Run **Sync Now** if the data is stale or if a device was recently changed.
5. Open **Overview** and review:
   - Critical devices.
   - New failures in the last 24 hours.
   - Top failure pattern.
   - Breakpoint buckets.
6. Open the highest-impact queue from Overview.
7. Triage one device at a time from **Device Queue**.
8. On a device detail page, use breakpoints first:
   - Identity.
   - Targeting.
   - Enrollment.
   - Compliance & Drift.
9. Copy the device summary into the ticket when opening an escalation or
   handing off to another technician.
10. Use remote actions only after confirming the device identity and expected
    impact.
11. Check **Action Audit** after actions to confirm Graph accepted or rejected
    the request.

## First-run and readiness checks

Before another technician relies on Runway for live triage, an admin should
complete these checks.

### Graph and data readiness

- Graph credentials are configured.
- `SEED_MODE=none` is used for live validation.
- Mock data is not mixed with production screenshots or reporting.
- A full sync completes without errors.
- At least five known devices match expected Autopilot, Intune, Entra, and
  ConfigMgr-presence states.
- Tag mappings exist for common group tags.

### Access readiness

- App access gate behavior is understood.
- Delegated admin sign-in works.
- Sign-out works.
- At least one low-risk action, such as Intune sync, has been validated.
- LAPS and BitLocker retrieval permissions have been validated only with
  approved test devices.

### Documentation readiness

- Technicians know where this guide lives.
- Troubleshooting references are available in
  [docs/troubleshooting.md](./troubleshooting.md).
- Graph setup details are available in [docs/graph-setup.md](./graph-setup.md).
- Live validation is tracked with
  [docs/live-testing-checklist.md](./live-testing-checklist.md).

## Navigation overview

Runway is organized into three navigation groups.

### Triage

- **Overview** - fleet health, top failures, trends, and entry points.
- **Devices** - searchable, filterable device queue.

### Inspect

- **Profiles** - Autopilot deployment profile health and impacted devices.
- **Groups** - Entra targeting groups, membership rules, assigned profiles, and
  member health.
- **Provisioning** - group-tag path builder and validation tool.

### System

- **Sync** - Graph ingestion status and sync history.
- **Action Audit** - remote-action timeline and export.
- **Settings** - Graph credentials, access, feature flags, tag mapping, rules,
  system health, and app logs.

The sidebar may also show property shortcuts when tag mappings define property
labels. These shortcuts open the Device Queue filtered to that property.

## Overview page

The Overview page is the default triage entry point.

Use it to answer:

- How many devices are currently known?
- How many are critical, warning, info, healthy, or unknown?
- What changed in the last 24 hours?
- What failure pattern is most common?
- Which subsystem is breaking most often?

Important areas:

- **Sync indicator** - shows last sync state and whether sync is currently
  running.
- **Sync Now** - starts a full sync.
- **Search devices** - quick device lookup.
- **Triage command center** - highlights active operational queues.
- **Health summary** - visual distribution of health.
- **Health trend** - 14-day fleet trend.
- **Recent changes** - devices that transitioned health state.
- **Failure patterns** - most common active flags.
- **Breakpoints** - grouped links into identity, targeting, enrollment, and
  drift issue queues.
- **Queues** - quick links to critical devices, profile audit, and all devices.

Recommended use:

1. Start with **New failures** and **Top failure**.
2. Use **Breakpoints** to choose a queue.
3. Avoid starting with raw device lists unless you already have a device name
   or serial number.

## Device Queue

The Device Queue is the technician worklist.

You can filter by:

- Search text.
- Health level.
- Flag.
- Property.
- Profile.

You can also:

- Save common views.
- Change visible columns.
- Switch row density.
- Export the current page to CSV.
- Select devices for bulk actions.
- Clear filters when a search narrows too far.

### Searching

Search by the strongest identifier available:

1. Serial number.
2. Device name.
3. User or property label if exact device identity is unknown.

If a device does not appear:

- Run a sync.
- Check whether the device exists in Autopilot, Intune, or Entra.
- Search by serial instead of name.
- Check whether filters are hiding it.

### Filtering

Use health filters for queue work:

- **Critical** - start here for broken devices.
- **Warning** - review after critical devices.
- **Info** - use for cleanup and awareness.
- **Healthy** - use for comparison with known-good devices.
- **Unknown** - usually new or incomplete data.

Use flag filters when a pattern is already known, such as
`not_in_target_group` or `identity_conflict`.

Use property and profile filters for site-specific triage.

### Saved views

Saved views are useful for repeat work:

- My property critical devices.
- New provisioning failures.
- Devices missing profile assignment.
- Hybrid join risk.
- Identity conflicts.

Keep saved views operational and specific. A view that nobody acts on should be
removed or renamed.

### Bulk selection

When one or more devices are selected, Runway shows a floating bulk-action bar.
Bulk actions available from the queue:

- Bulk sync.
- Bulk reboot.
- Rotate LAPS.

Before running bulk actions:

- Confirm the filter is correct.
- Review the selected count.
- Watch for selected devices that are off-page.
- Prefer smaller batches when testing a new action pattern.
- Review the completion result and Action Audit afterward.

## Device detail page

The device detail page is where technicians should make decisions. It is split
into a summary header, breakpoint chips, next-best-action guidance, join
picture, and subsystem tabs.

### Header

The header shows:

- Device name or best display identifier.
- Serial number.
- Property label.
- Active issue count.
- Correlation confidence.
- Overall health.
- Diagnosis summary.

If Runway shows **name-only correlation**, pause before taking action. A
name-only match is the weakest join. Confirm serial number, ZTDID, Intune ID,
or Entra device ID before rebooting, wiping, retiring, or deleting records.

### Breakpoint chips

Use these first:

- **Identity** - source record matching and join confidence.
- **Targeting** - group membership and profile assignment.
- **Enrollment** - OOBE, Autopilot, Intune enrollment, and check-in state.
- **Drift** - compliance, hybrid join, ownership, and custom rules.

A clear chip means that subsystem has no active issue. A chip with a count
opens the relevant tab.

### Next Best Action

The next-best-action panel summarizes the most likely technician move. Treat it
as guidance, not automation. Confirm the evidence in the active tab before
making a change.

### Join Picture

The join picture shows whether Runway found records from:

- Autopilot.
- Intune.
- Entra.
- ConfigMgr client presence, if enabled.

Use this to quickly spot missing or orphaned source records.

## Device detail tabs

### Identity tab

Use Identity to confirm whether the device is the same object across systems.

Review:

- Autopilot identity.
- Intune identity.
- Entra identity.
- Match confidence.
- Name-only join warning.
- Hardware details.

Escalate or verify manually when:

- There is an identity conflict.
- Multiple records share the same serial.
- The device joined only by name.
- The serial number is blank, generic, duplicated, or changed by firmware.

### Targeting tab

Use Targeting to answer whether the device is on the expected assignment path.

Review:

- Assignment path.
- Expected group tag mapping.
- Autopilot profile assignment.
- Entra group memberships.
- Configuration profiles.

Common outcomes:

- Device has the wrong group tag.
- Device is not in the expected target group.
- Target group exists but has no profile assigned.
- Device has a profile, but it is not the expected one.
- The tag dictionary is missing or stale.

### Enrollment tab

Use Enrollment to inspect OOBE, Autopilot, Intune enrollment, and check-in
state.

Review:

- Provisioning timeline.
- ConfigMgr client signal, if enabled.
- Diagnostic flags.
- App status.

Common outcomes:

- Device has an Intune record but no Autopilot record.
- Profile assigned but enrollment has not landed.
- Device appears stalled past the configured provisioning window.
- Intune last check-in is stale.
- ConfigMgr client is or is not reported by Intune.

### Compliance & Drift tab

Use Compliance & Drift after a device previously looked good but changed.

Review:

- Compliance policy state.
- Conditional Access information.
- Custom rule violations.
- Hybrid join risk.
- Primary user mismatch.

Common outcomes:

- Compliance regressed after earlier success.
- Primary user changed or does not match Autopilot assignment.
- Hybrid join trust/profile expectations drifted.
- Site-specific custom rule fired.

### Actions tab

Use Actions for remote operations and sensitive secret retrieval.

Available panels:

- Remote Actions.
- LAPS password.
- BitLocker recovery keys.
- Related devices.
- Action history.

Only perform actions after confirming identity and intent.

### History & Raw Data tab

Use History & Raw Data for escalation and evidence.

Review:

- Device state transitions.
- Raw Graph source JSON.

Use raw data when:

- A Graph value looks wrong in the UI.
- Another admin needs exact source evidence.
- You are opening a bug or service escalation.

Do not paste raw JSON into public channels. It can contain tenant and device
metadata.

## Remote actions

Remote actions require delegated admin sign-in. Runway logs every action attempt
to the action audit trail.

### Action safety levels

| Action | Risk | Notes |
| --- | --- | --- |
| Sync Now | Low | Forces Intune check-in. Good first action. |
| Reboot | Medium | User may be disconnected. Confirm timing. |
| Rename | Medium | Changes device name in Intune. Confirm naming standard. |
| Rotate LAPS | Medium | New password appears after next check-in. |
| Change Primary User | Medium | Requires correct UPN or Entra user object ID. |
| Autopilot Reset | High | Resets to OOBE while keeping enrollment; user data is wiped. |
| Retire | High | Removes management and company data; device remains usable. |
| Factory Wipe | Critical | Full reset; all data erased and device unenrolled. |
| Delete from Intune | Critical | Deletes Intune managed-device record. |
| Delete from Autopilot | Critical | Removes Autopilot registration; hardware hash must be re-imported. |

### Before any action

Confirm:

- You are signed in as yourself.
- The device identity is correct.
- The device has the required source record. For example, Intune-backed actions
  require an Intune enrollment.
- The user or site has approved the action when user impact is possible.
- The ticket notes explain why the action is being taken.

### After any action

1. Watch the toast result.
2. Open Action Audit.
3. Confirm Graph response status.
4. Run a sync after the expected service delay.
5. Add the result to the ticket.

### Destructive actions

Destructive actions require typed confirmation. This is intentional friction.
Do not work around it.

For wipe, retire, delete, and Autopilot reset:

- Confirm serial number.
- Confirm business approval.
- Confirm backup or data-loss expectations.
- Confirm the device is not a shared, kiosk, executive, or revenue-impacting
  endpoint without site approval.
- Prefer escalation when identity confidence is not high.

## LAPS and BitLocker retrieval

LAPS and BitLocker retrieval require delegated admin sign-in and the matching
Graph permissions.

### LAPS

The LAPS panel retrieves the current local administrator password.

Behavior:

- Password is fetched on demand.
- Retrieval is logged.
- Password auto-hides after 30 seconds.
- Copy-to-clipboard is available.
- Password is not persisted in Runway's local database.

Use LAPS only when needed for approved local admin access. Do not retrieve it
as a curiosity check.

### BitLocker

The BitLocker panel retrieves recovery keys for the device.

Behavior:

- Keys are fetched on demand.
- Retrieval is logged.
- Keys auto-hide after 60 seconds.
- Copy-to-clipboard is available.
- Keys are not persisted in Runway's local database.

Use BitLocker keys only for approved recovery scenarios.

## Profiles page

The Profiles page shows Autopilot deployment profile health from a profile-first
perspective.

Use it to answer:

- Which profiles have unhealthy devices?
- Which profile is associated with a recurring failure?
- Are profile assignment issues concentrated in one deployment mode?
- Which devices should be opened from a profile queue?

Recommended workflow:

1. Open Profiles.
2. Find profiles with critical or warning health.
3. Inspect the profile drawer.
4. Open affected devices.
5. Compare the profile's target groups with the Groups page.

If no profiles appear, run a sync and confirm Graph permissions.

## Groups page

The Groups page shows Entra groups, membership rules, assigned profiles, and
member health.

Use it to answer:

- Does the expected target group exist?
- Is the group static or dynamic?
- What membership rule controls it?
- Which Autopilot profiles are assigned to it?
- Are the unhealthy members concentrated in one group?

Recommended workflow:

1. Search for the group.
2. Review membership type and membership rule.
3. Check assigned profiles.
4. Filter members to unhealthy or critical.
5. Open representative devices from the member table.

For dynamic groups, Runway can show the rule but does not evaluate every Entra
dynamic-membership edge case. If membership looks wrong, verify in Entra.

## Provisioning Builder

Provisioning Builder traces a group tag through target groups and deployment
profiles.

Use it when:

- A new property or device class is being configured.
- A group tag should map to a specific target group and profile.
- A technician needs to verify a provisioning chain before handing off.
- A tag mapping appears stale or missing.

Workflow:

1. Enter the exact Autopilot group tag.
2. Click **Discover**.
3. Review devices with that tag.
4. Review matching groups.
5. Review matching profiles.
6. Select the target group that should receive the device.
7. Select the deployment profile that should apply.
8. Compare both selections to stored tag mapping expectations.
9. Click **Validate Chain**.
10. Copy or export the summary into the ticket or change request.

Validation output may include errors or warnings. Errors should be fixed before
the chain is treated as production-ready. Warnings should be reviewed and either
fixed or documented.

### Hardware hash import

Provisioning includes hardware hash import support for Autopilot registration
workflows. Treat imports as production-impacting changes:

- Confirm the CSV source.
- Confirm the group tag.
- Confirm the device should be added to the tenant.
- Review Action Audit after import.

## Sync page

The Sync page shows Graph ingestion state.

Use it to answer:

- Is Graph connected?
- Is a sync running?
- When did the last sync complete?
- Did the last sync fail?
- How many devices were synced?
- What errors were returned?

Recommended workflow:

1. Open Sync before major triage.
2. Confirm Graph Connected is **Yes**.
3. Confirm the last sync is recent.
4. Run Full Sync if needed.
5. If the sync fails, expand errors and compare with
   [docs/troubleshooting.md](./troubleshooting.md).

Do not repeatedly click Run Full Sync while a sync is already running.

## Action Audit page

The Action Audit page shows remote-action history and operator identity.

It requires delegated admin sign-in because it includes triggered-by details.

Use it to answer:

- Which actions were attempted?
- Who triggered them?
- Which devices were targeted?
- Did Graph accept or reject each request?
- Were bulk actions partially successful?

Filters:

- All.
- Success.
- Failed.
- Action type.

Export:

- Use **Export CSV** for change review, incident review, or handoff.

Important interpretation:

- A successful Graph response means Graph accepted the request.
- It does not always mean the endpoint has completed the action yet.
- Follow with a sync and device check-in review when action completion matters.

## Settings page

Settings is the operational control surface. Some sections are read-only for
technicians unless they are signed in as delegated admins.

### Graph Integration

Shows whether required Graph credentials are present:

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET` or certificate-based equivalent

Graph credentials power read-only ingestion. Changes usually require a server
restart.

### App Access

Shows whether the Entra access gate is active.

Important fields:

- `APP_ACCESS_MODE`
- `APP_ACCESS_ALLOWED_USERS`

If an allow-list locks users out, an admin can set
`APP_ACCESS_MODE=disabled` in `.env` and restart as a recovery path.

### Admin Sign-In

Shows whether the current technician is signed in for delegated actions.

Required delegated scopes include Intune action scopes, LAPS, BitLocker, group
write, service config write, and `User.Read`.

### SCCM / ConfigMgr Signal

Enables or disables ConfigMgr client presence visibility.

This signal reads Intune `managementAgent`. It does not connect to a ConfigMgr
site server.

Statuses:

| Status | Meaning |
| --- | --- |
| ConfigMgr client reported | Intune reports `configurationManager` in `managementAgent`. |
| ConfigMgr client not reported | Intune reports a management agent that does not include ConfigMgr. |
| Not reported by Intune | Intune record exists but did not return `managementAgent`. |
| Cannot determine | No correlated Intune managed-device record exists. |
| Signal disabled | Feature flag is off in Settings. |

### Data Sources

Shows the source systems Runway uses:

- Autopilot.
- Intune.
- Entra.
- ConfigMgr presence derived from Intune.

### Tag Mapping

Tag mapping defines expected property, group, and profile per group tag.

Actions:

- Add mapping.
- Preview impact.
- Save mapping.
- Import JSON.
- Export JSON.
- Delete mapping.

Always preview impact before saving large mapping changes. Mapping changes can
alter health flags for many devices after the next compute pass.

### System Health and Retention

Use this section to inspect local database and retention state. Retention and
maintenance behavior should be treated as admin-level operations.

### Custom Rules

Custom rules add site-specific health checks. Rules can be scoped globally, by
property, or by profile.

Technician guidance:

- Read the rule title and severity before acting.
- Confirm whether a custom rule is advisory or operationally required.
- Escalate unclear custom-rule failures to the endpoint admin who owns the
  rule.

### Recent Logs

Recent Logs shows Runway app logs from the local pino ring buffer.

Use it for:

- Sync failures.
- Auth issues.
- Action errors.
- Unexpected app behavior.

These are Runway application logs, not Entra audit logs.

## Health flags and what to do

| Flag | Severity | What it usually means | Technician response |
| --- | --- | --- | --- |
| `identity_conflict` | Critical | Multiple records resolve to the same hardware. | Do not run destructive actions. Verify serial/ZTDID in Microsoft portals and escalate. |
| `no_autopilot_record` | Critical | Intune device exists but matching Autopilot record is missing. | Confirm whether the device should be Autopilot-managed. Check hardware hash/import state. |
| `no_profile_assigned` | Critical | Autopilot record exists but no deployment profile resolves. | Check group tag, target group, and profile assignment. Use Provisioning Builder. |
| `not_in_target_group` | Critical | Tag mapping expects a group that does not contain the device. | Check group membership, dynamic rule, and tag mapping. |
| `profile_assignment_failed` | Critical | Intune reports profile assignment failure. | Review profile assignment in Intune and device Autopilot state. |
| `provisioning_stalled` | Critical | Device appears stuck longer than expected. | Check last check-in, user/device state, network, and OOBE status. Consider sync first. |
| `profile_assigned_not_enrolled` | Warning | Profile assigned but enrollment has not happened within the SLA. | Confirm device has booted and can reach Microsoft services. Recheck after sync. |
| `deployment_mode_mismatch` | Warning | Effective deployment mode differs from expectation. | Compare tag mapping, profile, and assigned group. |
| `hybrid_join_risk` | Warning | Hybrid join expectation and observed state may not line up. | Verify join type, domain line-of-sight, and profile intent. |
| `user_mismatch` | Warning | Autopilot assigned user differs from Intune primary user. | Confirm intended owner. Change primary user only with approval. |
| `compliance_drift` | Warning | Compliance regressed since previous sync. | Review compliance policies and recent changes. |
| `missing_ztdid` | Warning | Entra object is missing the ZTDID extension attribute. | Confirm Autopilot/Entra correlation. Escalate if repeated. |
| `tag_mismatch` | Warning | Group tag is not in the tag dictionary. | Add or correct tag mapping after confirming expected property/path. |
| `orphaned_autopilot` | Info | Autopilot record exists with no matching Intune device. | Normal for unassigned stock, suspicious for deployed devices. Verify lifecycle. |

## Common triage playbooks

### New device did not provision

1. Search by serial number.
2. Open device detail.
3. Check Identity.
4. Check Targeting.
5. Check Enrollment.
6. If `no_profile_assigned`, use Provisioning Builder for the group tag.
7. If `not_in_target_group`, verify group membership and dynamic rule.
8. If `provisioning_stalled`, check last check-in and OOBE status.
9. Run Sync Now only after confirming the device has network access or the
   action is appropriate.
10. Add copied summary and findings to the ticket.

### Device is in Intune but not Autopilot

1. Confirm serial number in Intune.
2. Check whether Autopilot record exists in Microsoft admin center.
3. Check hardware hash import history if available.
4. If the device should be Autopilot-managed, escalate for registration/import.
5. If it should not be Autopilot-managed, document exception.

### Device has wrong profile

1. Open Targeting tab.
2. Review assignment path.
3. Open Provisioning Builder with the group tag.
4. Compare selected group and selected profile to tag mapping.
5. Check Groups page for profile assignments.
6. Correct group/profile assignment outside Runway, then sync.

### Device appears duplicated

1. Open Identity tab.
2. Confirm whether Runway reports identity conflict or weak correlation.
3. Search by serial number in Device Queue.
4. Compare Autopilot, Intune, and Entra identifiers.
5. Do not wipe, retire, or delete until the correct record is confirmed.
6. Escalate with raw source summary if needed.

### User reports BitLocker recovery screen

1. Search by serial or device name.
2. Confirm identity confidence.
3. Sign in with delegated admin account.
4. Open Actions tab.
5. Retrieve BitLocker key.
6. Provide key only through approved support channel.
7. Confirm Action Audit records the retrieval.
8. Add ticket note.

### Need local admin access

1. Confirm local admin access is approved.
2. Search and open device.
3. Confirm identity confidence.
4. Sign in with delegated admin account.
5. Retrieve LAPS password.
6. Use the password only for the approved support task.
7. Rotate LAPS afterward if policy requires it.
8. Add ticket note.

### Bulk sync a property queue

1. Open the property shortcut or filter Device Queue by property.
2. Apply health or flag filters if needed.
3. Select a small known batch first.
4. Run Bulk sync.
5. Review partial-failure results.
6. Open Action Audit for failures.
7. Run a full sync after endpoints have had time to check in.

## Escalation and handoff

Escalate when:

- Identity confidence is low or conflicting.
- A destructive action is being considered.
- More than one source system disagrees in a way Runway cannot explain.
- Graph repeatedly returns permission or service errors.
- A custom rule fires and the technician does not own the rule.
- A group tag or profile mapping affects many devices.
- ConfigMgr health beyond client presence is required.

Include this information in handoff:

- Device name.
- Serial number.
- Property.
- Health.
- Active flags.
- Correlation confidence.
- Relevant breakpoint tab.
- Last sync time.
- Any action attempted.
- Graph response status from Action Audit.
- Copied Runway summary.
- Screenshots only if allowed by policy.

Do not include LAPS passwords, BitLocker keys, client secrets, or raw access
tokens in handoff notes.

## Security and data handling

Runway is local-first:

- Device state is stored on the operator workstation.
- Action history is stored locally.
- There is no Runway cloud service.
- External calls are to Microsoft login and Graph endpoints.

Technician rules:

- Lock the workstation when stepping away.
- Sign out after delegated admin work.
- Do not export CSVs unless there is an operational reason.
- Store exports only in approved locations.
- Delete local exports when the ticket or review no longer needs them.
- Do not paste raw source JSON into public chat.
- Never commit `.env`, signing keys, exported secrets, or database files.

## Troubleshooting Runway itself

### App shows mock data

Likely causes:

- Graph credentials are missing.
- `SEED_MODE=mock` is set.
- The app was started with an empty database and no live credentials.

Response:

1. Open Settings.
2. Check Graph Integration.
3. Confirm `.env` values.
4. Set `SEED_MODE=none` for live validation.
5. Restart and sync.

### Sync fails

Response:

1. Open Sync.
2. Read the last error.
3. Open Settings > Recent Logs.
4. Confirm Graph credentials and permissions.
5. Check [docs/troubleshooting.md](./troubleshooting.md).
6. Escalate with exact error text.

### Remote actions are unavailable

Likely causes:

- Technician is not signed in.
- Delegated token expired.
- Required Graph delegated permissions are missing.
- Device lacks Intune enrollment.
- Action is not valid for that source record.

Response:

1. Sign in again.
2. Confirm the device has an Intune ID.
3. Check Action Audit.
4. Check Settings > Recent Logs.

### LAPS or BitLocker retrieval fails

Likely causes:

- Missing delegated permission.
- Device does not have a backed-up secret/key.
- Graph denied access.
- Token expired.

Response:

1. Sign out and sign back in.
2. Confirm delegated scopes.
3. Confirm the device exists in Entra/Intune as expected.
4. Check Action Audit and Recent Logs.
5. Escalate with exact error text.

### Device data looks stale

Response:

1. Check Sync last completed time.
2. Run Full Sync.
3. Confirm the Microsoft admin center reflects the expected change.
4. Wait for Microsoft service propagation if the change was recent.
5. Reopen the device detail page.

## Glossary

| Term | Meaning |
| --- | --- |
| Autopilot | Microsoft Windows provisioning service based on registered hardware records. |
| BitLocker | Windows disk encryption. Runway can retrieve recovery keys when allowed. |
| ConfigMgr/SCCM | Microsoft Configuration Manager. Runway v1 only shows client presence reported by Intune. |
| Delegated auth | A signed-in admin user's Microsoft Graph session for actions and secrets. |
| Entra ID | Microsoft identity platform formerly known as Azure Active Directory. |
| Graph | Microsoft Graph API used to read and act on Microsoft cloud resources. |
| Group tag | Autopilot hardware-order/group-tag value used to route devices. |
| Intune | Microsoft endpoint management service. |
| LAPS | Local Administrator Password Solution. |
| OOBE | Windows out-of-box experience during provisioning. |
| Profile | Windows Autopilot deployment profile. |
| Tag mapping | Runway dictionary connecting group tags to expected properties, groups, and profiles. |
| ZTDID | Zero Touch Deployment ID used in Autopilot/Entra correlation. |
