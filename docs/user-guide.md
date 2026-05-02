# Runway User Guide

This guide is written for the IT admins and help-desk technicians who use
Runway to triage Windows Autopilot, Intune, Entra ID, and ConfigMgr/SCCM
client-presence issues for a single tenant.

Runway is a local-first Windows triage console. It does not replace the
Intune admin center, the Entra admin center, or the Configuration Manager
console. Its job is to bring the common provisioning evidence into one
focused workflow so an admin can answer:

- Which Windows devices need attention?
- What part of the provisioning path is broken?
- What evidence supports that conclusion?
- What low-risk action or escalation should happen next?

Runway can fix some things directly through Microsoft Graph (sync, reboot,
rotate LAPS, change primary user, retire, wipe, Autopilot reset, delete
records). Anything beyond those — group membership edits, profile
authoring, conditional access policy changes, ConfigMgr client repair — is
deep-linked out to the appropriate Microsoft portal.

## Table of contents

- [Who should use Runway](#who-should-use-runway)
- [What Runway can and cannot do](#what-runway-can-and-cannot-do)
- [First-run setup](#first-run-setup)
- [Sync status pill](#sync-status-pill)
- [Daily triage workflow](#daily-triage-workflow)
- [Access and sign-in model](#access-and-sign-in-model)
- [Core concepts](#core-concepts)
- [Navigation overview](#navigation-overview)
- [Overview page](#overview-page)
- [Device Queue](#device-queue)
- [Device detail page](#device-detail-page)
- [Remote actions](#remote-actions)
- [LAPS and BitLocker retrieval](#laps-and-bitlocker-retrieval)
- [Profiles page](#profiles-page)
- [Groups page](#groups-page)
- [Tags view](#tags-view)
- [Provisioning Builder](#provisioning-builder)
- [Build Payload panel](#build-payload-panel)
- [Sync page](#sync-page)
- [Action Audit page](#action-audit-page)
- [Settings page](#settings-page)
- [Health flags and what to do](#health-flags-and-what-to-do)
- [Common triage playbooks](#common-triage-playbooks)
- [Tenant testing workflow](#tenant-testing-workflow)
- [Escalation and handoff](#escalation-and-handoff)
- [Security and data handling](#security-and-data-handling)
- [Troubleshooting Runway itself](#troubleshooting-runway-itself)
- [Glossary](#glossary)

## Who should use Runway

Runway is for the small-to-mid IT team that owns Windows endpoint
provisioning and device health across Autopilot, Intune, and Entra ID. It
is especially useful when a device has records in more than one Microsoft
system and the issue is not obvious from a single console.

Good fit:

- Help desk and endpoint admins triaging a Windows device that did not
  finish Autopilot.
- Admins reviewing unhealthy or stalled Autopilot devices.
- Field admins validating that a device belongs to the expected property,
  group, and deployment profile.
- Tier 2 support collecting evidence before changing group membership,
  profile assignment, or device ownership.
- Admins reviewing what remote actions were attempted and who triggered
  them.

Poor fit:

- Non-Windows device management.
- Full Intune policy authoring.
- Bulk fleet remediation. Runway intentionally targets one device at a
  time for destructive work.
- Full ConfigMgr client health analysis.
- Software update compliance reporting.
- Tenant-wide security investigation or Entra audit-log review.

## What Runway can and cannot do

Runway can:

- Correlate Windows device records across Autopilot, Intune, and Entra ID.
- Show whether Intune reports a ConfigMgr client through `managementAgent`.
- Identify missing records, weak joins, duplicate identity signals,
  assignment drift, profile issues, and stalled provisioning.
- Show device health buckets and source evidence in one place.
- Run delegated Intune actions per device — sync, reboot, rename, rotate
  LAPS, change primary user, Autopilot reset, retire, factory wipe, delete
  the Intune record, delete the Autopilot registration.
- Run a small set of low-risk bulk actions (`sync`, `reboot`,
  `rotate-laps`) capped at 200 devices per request.
- Retrieve LAPS passwords and BitLocker recovery keys when the signed-in
  admin has the required Microsoft Graph permissions.
- Export the current device page to CSV and export the action audit log to
  CSV or NDJSON.
- Store local device state and action history in a local SQLite database.

Runway cannot:

- Author or edit Autopilot deployment profiles, configuration profiles,
  compliance policies, conditional access policies, or group membership.
  Those open the right Microsoft portal blade in a deep-link.
- Prove that a ConfigMgr client is healthy, assigned to the right site,
  pulling policy, or receiving updates. The ConfigMgr signal is
  presence-only.
- Fix group membership, deployment profiles, or compliance policies by
  itself.
- Guarantee a remote action completed on the endpoint. It can show whether
  Graph accepted or rejected the request.
- Replace Microsoft support escalation for Graph or service-side failures.
- Validate live tenant accuracy without known-good devices for comparison.

## First-run setup

The first time Runway opens against an empty database, the sidebar shows a
**Setup** link and the workspace shows a non-blocking first-run banner
until setup is complete. The same checklist is reachable any time at
`/setup`.

The checklist has three steps:

1. **Connect Entra tenant.** Add tenant ID, client ID, and either client
   secret or certificate through the Graph credentials wizard. The wizard
   refuses placeholder secrets shorter than 32 characters and writes to
   the per-user `.env`. Server restart is required after credential
   changes.
2. **Run the initial sync.** One sync verifies Graph permissions and
   imports device data. The step is marked done when the sync completes
   and at least one device row has been imported. If the sync completes
   but no devices appear, Runway tells you to re-sync and check that the
   tenant actually contains Autopilot or Intune devices. Manual sync
   requires delegated admin sign-in.
3. **Map a group tag.** Add the first tag mapping (group tag, property
   label, optional expected groups/profiles). Most admins only need group
   tag and property label — strict expected groups and profiles are
   Advanced controls and should only be used when you are enforcing a
   strict configuration per tag.

The first-run banner clears once Graph is configured, sync succeeded with
device rows, and at least one tag mapping exists. The setup page is
always available from the sidebar after that, in case you reset state or
re-onboard a tenant.

## Sync status pill

The persistent pill in the top bar is the source of truth for sync
freshness. Its states are:

| Pill state | Meaning |
| --- | --- |
| `Synced 5m ago` (or `1h`, `3d`, `2w`, `5mo`, `1y`) | Sync succeeded; the timestamp is the last successful completion. |
| `Syncing…` | A sync is running now. |
| `Sync failed - click for details` | The most recent sync attempt errored. Click the pill to read the exact error. |
| `Never synced` | No successful sync recorded yet. Expected on first run. |

Click the pill to open the freshness panel. It shows the last successful
sync timestamp, whether one is currently running, the most recent error
text if any, the data sources Runway pulls (Autopilot, Intune, Entra
devices and groups, profiles, assignments, compliance, configuration, and
app payload data), and a `Run sync` button when delegated admin sign-in
is active. If you are not signed in, the pill explains that manual sync
requires delegated admin sign-in.

## Daily triage workflow

Use this flow at the start of a support shift:

1. Open Runway.
2. Confirm whether you are in live mode or mock mode (mock mode shows an
   amber banner).
3. Read the sync status pill. If sync failed, open it for details. If the
   data is stale, run a sync.
4. Open **Overview** and review:
   - Critical devices.
   - New failures in the last 24 hours.
   - Top failure pattern.
   - Problem-area buckets (Identity, Targeting, Enrollment, Drift).
5. Open the highest-impact queue from Overview.
6. Triage one device at a time from **Devices**.
7. On a device detail page, use the problem-area chips first.
8. Copy the device summary into the ticket when opening an escalation or
   handing off.
9. Use remote actions only after confirming the device identity and
   expected impact. Take destructive actions one device at a time.
10. Check **Action Audit** after acting to confirm Graph accepted or
    rejected each request.

## Access and sign-in model

Runway has two related but distinct access concepts.

### App access gate

The app access gate controls whether a user can enter the Runway
workspace at all. When `APP_ACCESS_MODE=entra`, the user must sign in
with an Entra account from the configured tenant (and pass the optional
allow-list) before seeing fleet data.

If the gate is disabled, Runway still protects the local API. There is
no anonymous open API path: every `/api/*` route requires the per-install
desktop token, a delegated admin session, or an Entra app-access session.

### Delegated admin sign-in

Delegated admin sign-in is required for sensitive actions:

- Single-device and bulk Intune actions.
- LAPS password retrieval.
- BitLocker recovery key retrieval.
- Viewing and exporting Action Audit.
- Editing tag mappings and operational/security settings.
- Triggering manual sync.

Reading dashboards and device state uses the configured app-only Graph
credentials. Taking action uses the signed-in delegated admin identity.
Browsing device health and changing devices are intentionally separate
trust levels.

The sidebar shows a sign-out button when an admin session is active. Use
it on shared workstations.

### Required behaviour for admins

- Sign in only with your own named admin account.
- Sign out when finished on a shared workstation.
- Do not share retrieved LAPS passwords or BitLocker keys outside the
  ticket, chat, or escalation path that requires them.
- Treat every destructive confirmation as final. Confirmations are always
  enforced.

## Core concepts

### Device identity correlation

A single physical device can appear in multiple Microsoft systems:

- Autopilot hardware record.
- Intune managed device.
- Entra device object.
- ConfigMgr client presence signal reported through Intune.

Runway joins those records using serial number, ZTDID, device IDs, and
related identity fields. A strong join means the records agree. A weak
join, such as a name-only match, means you should verify identity before
acting.

### Health levels

Runway assigns device health from the worst active flag:

| Health | Meaning |
| --- | --- |
| Critical | Broken, conflicting, or likely requiring action. |
| Warning | Risky, drifting, or past an expected provisioning window. |
| Info | Notable but not necessarily broken by itself. |
| Healthy | No active flags. |
| Unknown | Not enough data exists yet to evaluate confidently. |

### Problem areas

Runway groups diagnostic flags into four problem areas (also called
breakpoints in the engine):

| Problem area | What it answers |
| --- | --- |
| Identity | Is this the same device across Autopilot, Intune, and Entra? |
| Targeting | Is the device in the expected group and profile path? |
| Enrollment | Did the Autopilot and Intune provisioning path actually land? |
| Compliance & Drift | Did ownership, join, compliance, or rule state drift later? |

Use problem areas before scrolling through raw data. They are the fastest
way to decide where to investigate.

### Tag mapping

The tag mapping dictionary tells Runway what an Autopilot group tag is
supposed to mean. For each group tag, it can store:

- Property label (required).
- Expected Autopilot deployment profile names (optional, Advanced).
- Expected target Entra group names (optional, Advanced).

Without tag mappings, Runway can still show source data but cannot
reliably judge `tag_mismatch` or `not_in_target_group`. Strict expected
groups and profiles are Advanced controls; expectation warnings are
suppressed when no expectations are configured for a tag.

Edit individual tag mappings from the **Tags** view. Settings only
handles JSON import/export.

### Mock mode vs live data

Mock mode uses seeded demo data. It is useful for training and demos.
Live data uses the configured Microsoft Graph credentials.

Before making real operational decisions:

- Confirm the mock banner is gone.
- Confirm Graph is configured in Settings.
- Run a fresh sync.
- Validate several known devices against Microsoft admin centers.

## Navigation overview

Runway is organised into three navigation groups.

### Triage

- **Overview** - fleet health, top failures, trends, and entry points.
- **Devices** - searchable, filterable device queue.

### Inspect

- **Profiles** - Autopilot deployment profile health and impacted devices.
- **Groups** - Entra targeting groups, membership rules, assigned
  profiles, and member health.
- **Tags** - Autopilot group tag inventory and tag mapping editor.
- **Provisioning** - group-tag path builder, validation, and Build
  Payload panel.

### System

- **Sync** - Graph ingestion status and sync history.
- **Action Audit** - remote-action timeline and export.
- **Settings** - Graph credentials, access, sync/data, rules, tag
  mapping import/export, system health, and app logs.

The sidebar may also show property shortcuts when tag mappings define
property labels. These shortcuts open the Device Queue filtered to that
property.

## Overview page

The Overview page is the default landing page after setup is complete.

Use it to answer:

- How many devices are currently known?
- How many are critical, warning, info, healthy, or unknown?
- What changed in the last 24 hours?
- What failure pattern is most common?
- Which subsystem is breaking most often?

Important areas:

- **Sync indicator** - mirrors the sync status pill.
- **Search devices** - quick device lookup.
- **Triage command center** - highlights active operational queues.
- **Health summary** - visual distribution of health.
- **Health trend** - 14-day fleet trend.
- **Recent changes** - devices that transitioned health state.
- **Failure patterns** - most common active flags.
- **Problem areas** - grouped links into Identity, Targeting, Enrollment,
  and Drift queues.
- **Queues** - quick links to critical devices, profile audit, and all
  devices.

Recommended use:

1. Start with **New failures** and **Top failure**.
2. Use **Problem areas** to choose a queue.
3. Avoid starting with raw device lists unless you already have a device
   name or serial number.

## Device Queue

The Device Queue is the admin worklist.

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
- Select devices for bulk sync, reboot, or rotate-laps.
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

Saved views are useful for repeat work. The five built-in presets (All,
Critical, No profile, User mismatch, Provisioning stalled) remain as
locked defaults; custom views are stored locally and can be reordered,
renamed, or deleted.

### Bulk selection

When one or more devices are selected, Runway shows a floating bulk-action
bar. Bulk actions available from the queue:

- Bulk sync.
- Bulk reboot.
- Rotate LAPS.

Bulk actions are capped at 200 devices per request and are limited to
non-destructive or fully reversible operations. Retire, wipe, Autopilot
reset, rename, change primary user, and the delete cleanups remain
single-device clicks.

Before running bulk actions:

- Confirm the filter is correct.
- Review the selected count.
- Watch for selected devices that are off-page.
- Prefer smaller batches when testing a new action pattern.
- Review the completion result and Action Audit afterward.

## Device detail page

The device detail page is where admins should make decisions. It is split
into a summary header, problem-area chips, next-best-action guidance, join
picture, and tabs.

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
name-only match is the weakest join. Confirm serial number, ZTDID, Intune
ID, or Entra device ID before rebooting, wiping, retiring, or deleting
records.

### Problem-area chips

Use these first:

- **Identity** - source record matching and join confidence.
- **Targeting** - group membership and profile assignment.
- **Enrollment** - OOBE, Autopilot, Intune enrollment, and check-in state.
- **Drift** - compliance, hybrid join, ownership, and custom rules.

A clear chip means that subsystem has no active issue. A chip with a
count opens the relevant tab.

### Next Best Action

The next-best-action panel summarises the most likely admin move. Treat
it as guidance, not automation. Confirm the evidence in the active tab
before making a change.

### Join Picture

The join picture shows whether Runway found records from:

- Autopilot.
- Intune.
- Entra.
- ConfigMgr client presence, if enabled.

Use this to quickly spot missing or orphaned source records.

### Tabs and `?tab=` deep links

Device detail panels are organised into named tabs (Identity, Targeting,
Enrollment, Drift, Operate, History) with deep-linkable `?tab=` search
params, so a ticket can reference a specific section. The default tab
auto-selects the highest-severity failing subsystem when none is
specified. Each device-detail tab also exposes responsive breakpoints —
on a narrow window the tab content wraps; on a wide window it lays out
side-by-side.

#### Identity tab

Use Identity to confirm whether the device is the same object across
systems.

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

#### Targeting tab

Use Targeting to answer whether the device is on the expected assignment
path.

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

When a fix needs an Intune or Entra change (group membership, profile
assignment, dynamic rule), Runway opens the right portal blade in a deep
link rather than editing in-app.

#### Enrollment tab

Use Enrollment to inspect OOBE, Autopilot, Intune enrollment, and
check-in state.

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

#### Drift tab

Use Drift after a device previously looked good but changed.

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

#### Operate tab

Use Operate for remote operations and sensitive secret retrieval.

Available panels:

- Remote Actions (sync, reboot, rename, rotate LAPS, change primary user,
  Autopilot reset, retire, factory wipe, delete-from-Intune,
  delete-from-Autopilot).
- LAPS password.
- BitLocker recovery keys.
- Related devices.
- Action history.

Only perform actions after confirming identity and intent.

#### History tab

Use History for escalation and evidence.

Review:

- Device state transitions.
- Raw Graph source JSON.

Use raw data when:

- A Graph value looks wrong in the UI.
- Another admin needs exact source evidence.
- You are opening a bug or service escalation.

Do not paste raw JSON into public channels. It can contain tenant and
device metadata.

## Remote actions

Remote actions require delegated admin sign-in. Runway logs every action
attempt to the action audit trail.

### Action safety levels

| Action | Risk | Notes |
| --- | --- | --- |
| Sync Now | Low | Forces Intune check-in. Good first action. |
| Reboot | Medium | User may be disconnected. Confirm timing. |
| Rename | Medium | Changes device name in Intune. Confirm naming standard. |
| Rotate LAPS | Medium | New password appears after next check-in. |
| Change Primary User | Medium | Search by display name, UPN, or mail in the EntityPicker. |
| Autopilot Reset | High | Resets to OOBE while keeping enrollment; user data is wiped. |
| Retire | High | Removes management and company data; device remains usable. |
| Factory Wipe | Critical | Full reset; all data erased and device unenrolled. |
| Delete from Intune | Critical | Deletes Intune managed-device record. |
| Delete from Autopilot | Critical | Removes Autopilot registration; hardware hash must be re-imported. |

### Change Primary User and the EntityPicker

The Change Primary User action uses the EntityPicker. Type any of the
following and Runway searches Entra users in the configured tenant:

- Display name (first or last name).
- User Principal Name (UPN).
- Primary email address.

Pick the user from the suggestion list and confirm. Runway sends the
selected Graph user ID to the action — you do not need to know or paste
the raw GUID.

### Before any action

Confirm:

- You are signed in as yourself.
- The device identity is correct.
- The device has the required source record. For example, Intune-backed
  actions require an Intune enrollment.
- The user or site has approved the action when user impact is possible.
- The ticket notes explain why the action is being taken.

### After any action

1. Watch the toast result.
2. Open Action Audit.
3. Confirm Graph response status.
4. Run a sync after the expected service delay.
5. Add the result to the ticket.

### Destructive actions

Destructive actions require typed confirmation. Confirmations are always
enforced — there is no toggle to disable them. Do not work around them.

For wipe, retire, delete, and Autopilot reset:

- Confirm serial number.
- Confirm business approval.
- Confirm backup or data-loss expectations.
- Confirm the device is not a shared, kiosk, executive, or revenue-impacting
  endpoint without site approval.
- Prefer escalation when identity confidence is not high.

## LAPS and BitLocker retrieval

LAPS and BitLocker retrieval require delegated admin sign-in and the
matching Graph permissions.

### LAPS

The LAPS panel retrieves the current local administrator password.

Behaviour:

- Password is fetched on demand.
- Retrieval is logged.
- Password auto-hides after 30 seconds.
- Copy-to-clipboard is available.
- Password is not persisted in Runway's local database.

Use LAPS only when needed for approved local admin access. Do not
retrieve it as a curiosity check.

### BitLocker

The BitLocker panel retrieves recovery keys for the device.

Behaviour:

- Keys are fetched on demand.
- Retrieval is logged.
- Keys auto-hide after 60 seconds.
- Copy-to-clipboard is available.
- Keys are not persisted in Runway's local database.

Use BitLocker keys only for approved recovery scenarios.

## Profiles page

The Profiles page shows Autopilot deployment profile health from a
profile-first perspective.

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

The Groups page shows Entra groups, membership rules, assigned profiles,
and member health.

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

For dynamic groups, Runway can show the rule but does not evaluate every
Entra dynamic-membership edge case. If membership looks wrong, verify in
Entra.

## Tags view

The Tags view is the source-of-truth surface for Autopilot group tags. It
combines the discovered tag inventory with the configured tag mappings.

Each row shows:

- Group tag.
- Whether the tag is configured (has a mapping) or discovered only.
- Property label, when configured.
- Device count for that tag.
- Health summary.

Use the Tags view to:

- Spot tags that exist on devices but have no mapping yet.
- Edit one tag mapping at a time.
- Open the Tags side drawer to add or change a mapping.
- Delete a stale mapping with a confirmation.
- Jump into the Provisioning Builder for a tag.

### Tag mapping drawer

The drawer edits one mapping at a time. Required fields:

- **Group tag** (locked when editing an existing mapping).
- **Property label.**

Optional fields, behind an **Advanced** disclosure:

- **Expected groups.**
- **Expected profiles.**

Most admins do not need the Advanced fields. Use them only when you are
enforcing a strict expected configuration per tag and want
`tag_mismatch`, `not_in_target_group`, or `deployment_mode_mismatch` to
fire on drift. With no Advanced expectations configured, expectation
warnings are suppressed for that tag.

Editing individual tag mappings is gated on delegated admin sign-in.

For backup, hand-off, or version control, use **Settings → Tag Mapping**
to import or export the full tag mapping set as JSON.

## Provisioning Builder

Provisioning Builder traces a single Autopilot group tag through target
groups, deployment profiles, and the Build Payload (apps, configuration
profiles, compliance policies) that the assigned group resolves to.

Use it when:

- A new property or device class is being configured.
- A group tag should map to a specific target group and profile.
- An admin needs to verify a provisioning chain before handing off.
- A tag mapping appears stale or missing.

Workflow:

1. Pick the Autopilot group tag.
2. Review the discovered devices that carry that tag.
3. Review matching groups and matching profiles.
4. Select the target group that should receive the device.
5. Select the deployment profile that should apply.
6. Compare both selections to the stored tag mapping expectations.
7. Read the Build Payload panel for the selected group.
8. Validate the chain.
9. Copy or export the summary into the ticket or change request.

Validation output may include errors or warnings. Errors should be fixed
before the chain is treated as production-ready. Warnings should be
reviewed and either fixed or documented.

### Hardware hash import

Provisioning includes hardware hash import support for Autopilot
registration workflows. Treat imports as production-impacting changes:

- Confirm the CSV source.
- Confirm the group tag.
- Confirm the device should be added to the tenant.
- Review Action Audit after import.

## Build Payload panel

The Build Payload panel sits inside Provisioning Builder. It shows what
the selected target group resolves to in Intune assignments — required
apps, configuration profiles, and compliance policies — so an admin can
sanity-check what a device will actually receive.

Build Payload distinguishes four states:

| State | What it means | What to do |
| --- | --- | --- |
| **No target group selected** | You have not picked a group yet. | Select a group to see its payload. |
| **Assignment data not synced** | Runway has not yet ingested assignment data for this tenant. | Run a sync. The "What now" guidance points to the sync action. |
| **Assignment data unavailable** | The sync hit an error or Graph returned no assignment data for the group. | Read the error, check Graph permissions and sync history, retry. |
| **Empty payload (confirmed)** | The group has no required apps, configuration profiles, or compliance policies assigned. | Confirm with the admin who owns the group whether that is intended. |

When required apps are missing or a payload is found through *another*
discovered group instead of the selected one, the panel shows a
**What now** warning explaining what that means and where to look in
Intune. Treat those warnings as evidence to investigate before treating
the chain as production-ready.

The payload has its own freshness timestamp; the wider sync status pill
covers the broader Graph ingestion state.

## Sync page

The Sync page shows Graph ingestion state in detail.

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

It requires delegated admin sign-in because it includes triggered-by
details. The Action Audit sign-in gate explains this when it is reached
without an admin session.

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
- A `format=ndjson` export is also available for log pipelines.

Important interpretation:

- A successful Graph response means Graph accepted the request.
- It does not always mean the endpoint has completed the action yet.
- Follow with a sync and device check-in review when action completion
  matters.

## Settings page

Settings is the operational control surface. Sections are organised into
numbered groups; section numbers will shift as the IA evolves, so use the
section titles below rather than indexing by number. Some sections are
read-only for admins unless they are signed in as delegated admins.

Settings groups in the current build:

- **Graph Integration** — credential status, missing-environment list,
  rotate/configure credentials wizard.
- **Sync & Data** — sync interval, retention sweep cadence (Advanced
  disclosure), seed mode visibility.
- **Tag Mapping** — JSON import/export only; edit individual mappings in
  the Tags view (the Settings card has a "Manage individual mappings in
  Tags view →" link).
- **Rules & Thresholds** — engine thresholds (`PROFILE_ASSIGNED_NOT_ENROLLED_HOURS`,
  `PROVISIONING_STALLED_HOURS`, sync interval, etc.).
- **Custom Rules** — site-specific rule editor with preview-matches dry
  run, sitting beside Rules & Thresholds.
- **Access & Security** — app access mode, allow-list, session timeout,
  destructive-action confirmation status (always enforced).
- **SCCM / ConfigMgr Signal** — the optional ConfigMgr presence flag.
- **Display & Behaviour** — theme (unified `display.theme` setting),
  date/time format, default landing screen, table page size.
- **System Health** — DB stats, retention sweep, recent logs.
- **About** — version, license, environment.

### Graph Integration

Shows whether required Graph credentials are present:

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET` or certificate-based equivalent

Graph credentials power read-only ingestion. Changes usually require a
server restart.

### Tag Mapping (Settings)

Settings only handles bulk JSON import/export of the full tag mapping
set:

- **Import JSON** — upserts by group tag.
- **Export JSON** — downloads the entire tag mapping array.

Use the **Tags** view in the sidebar for individual mapping edits.

### App Access

Shows whether the Entra access gate is active.

Important fields:

- `APP_ACCESS_MODE`
- `APP_ACCESS_ALLOWED_USERS`

If an allow-list locks users out, an admin can set
`APP_ACCESS_MODE=disabled` in `.env` and restart as a recovery path.

### Admin Sign-In

Shows whether the current admin is signed in for delegated actions. The
sidebar has a parallel sign-out control.

Required delegated scopes include Intune action scopes, LAPS, BitLocker,
group write, service config write, and `User.Read`.

### SCCM / ConfigMgr Signal

Enables or disables ConfigMgr client presence visibility.

This signal reads Intune `managementAgent`. It does not connect to a
ConfigMgr site server.

Statuses:

| Status | Meaning |
| --- | --- |
| ConfigMgr client reported | Intune reports `configurationManager` in `managementAgent`. |
| ConfigMgr client not reported | Intune reports a management agent that does not include ConfigMgr. |
| Not reported by Intune | Intune record exists but did not return `managementAgent`. |
| Cannot determine | No correlated Intune managed-device record exists. |
| Signal disabled | Feature flag is off in Settings. |

### Custom Rules

Custom rules add site-specific health checks. Rules can be scoped
globally, by property, or by profile. The editor includes a
preview-matches dry-run that evaluates the rule against the current
snapshot and shows the count and a sample of up to 25 devices that would
flag.

Admin guidance:

- Read the rule title and severity before acting.
- Confirm whether a custom rule is advisory or operationally required.
- Use **Preview matches** before enabling a new rule.
- Escalate unclear custom-rule failures to the endpoint admin who owns
  the rule.

### System Health and Retention

Use this section to inspect local database and retention state.
Retention and maintenance behaviour should be treated as admin-level
operations. The retention sweep interval is hidden behind an Advanced
disclosure to keep day-to-day Sync & Data settings focused.

### Recent Logs

Recent Logs shows Runway app logs from the local pino ring buffer.

Use it for:

- Sync failures.
- Auth issues.
- Action errors.
- Unexpected app behaviour.

These are Runway application logs, not Entra audit logs. Logs can be
exported via `GET /api/health/logs?level=warn&limit=200`.

## Health flags and what to do

| Flag | Severity | What it usually means | Admin response |
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
6. If `no_profile_assigned`, open Provisioning Builder for the group tag
   and read Build Payload.
7. If `not_in_target_group`, verify group membership and dynamic rule.
8. If `provisioning_stalled`, check last check-in and OOBE status.
9. Run Sync Now only after confirming the device has network access or
   the action is appropriate.
10. Add copied summary and findings to the ticket.

### Device is in Intune but not Autopilot

1. Confirm serial number in Intune.
2. Check whether Autopilot record exists in Microsoft admin center.
3. Check hardware hash import history if available.
4. If the device should be Autopilot-managed, escalate for
   registration/import.
5. If it should not be Autopilot-managed, document exception.

### Device has wrong profile

1. Open Targeting tab.
2. Review assignment path.
3. Open Provisioning Builder with the group tag.
4. Compare selected group and selected profile to tag mapping.
5. Read the Build Payload panel for the selected group.
6. Check Groups page for profile assignments.
7. Correct group/profile assignment in Intune (deep-link from Targeting),
   then sync.

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
4. Open Operate tab.
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

### Change a device's primary user

1. Open the device's Operate tab.
2. Click **Change Primary User**.
3. Type display name, UPN, or mail in the EntityPicker.
4. Pick the user from suggestions.
5. Confirm the action.
6. Watch the toast and Action Audit for Graph response.
7. Run a sync after Microsoft service propagation.

### Bulk sync a property queue

1. Open the property shortcut or filter Device Queue by property.
2. Apply health or flag filters if needed.
3. Select a small known batch first.
4. Run Bulk sync.
5. Review partial-failure results.
6. Open Action Audit for failures.
7. Run a full sync after endpoints have had time to check in.

## Tenant testing workflow

Before pointing Runway at a real tenant for the first time, work through
[docs/live-testing-checklist.md](./live-testing-checklist.md). At a
glance:

1. Run with `SEED_MODE=none` so seed data does not mix with live records.
2. Complete the `/setup` checklist on a small known device set.
3. Read the sync status pill — it must say `Synced X ago`, not `Sync
   failed` or `Never synced`.
4. Validate identity correlation and active flags on at least five known
   devices that match expected Autopilot, Intune, Entra, and
   ConfigMgr-presence states.
5. Sign in as a delegated admin and run the lowest-risk action (sync) on
   one known device.
6. Open Action Audit and confirm the sign-in identity, Graph response
   status, and per-device result for the action.
7. Only after read-only and low-risk flows pass, validate LAPS and
   BitLocker retrieval on a lab device.
8. Defer destructive validation (retire, wipe, Autopilot reset) until
   the rest of the checklist is signed off.

Mock data is realistic, but it is still fake. Do not mix mock and live
records when producing screenshots or reports for leadership.

## Escalation and handoff

Escalate when:

- Identity confidence is low or conflicting.
- A destructive action is being considered.
- More than one source system disagrees in a way Runway cannot explain.
- Graph repeatedly returns permission or service errors.
- A custom rule fires and the admin does not own the rule.
- A group tag or profile mapping affects many devices.
- ConfigMgr health beyond client presence is required.

Include this information in handoff:

- Device name.
- Serial number.
- Property.
- Health.
- Active flags.
- Correlation confidence.
- Relevant problem-area tab.
- Last sync time.
- Any action attempted.
- Graph response status from Action Audit.
- Copied Runway summary.
- Screenshots only if allowed by policy.

Do not include LAPS passwords, BitLocker keys, client secrets, or raw
access tokens in handoff notes.

## Security and data handling

Runway is local-first:

- Device state is stored on the operator workstation in a local SQLite
  database.
- Action history is stored locally.
- There is no Runway cloud service.
- External calls are to Microsoft login and Graph endpoints.

Admin rules:

- Lock the workstation when stepping away.
- Sign out after delegated admin work using the sidebar sign-out control.
- Do not export CSVs unless there is an operational reason.
- Store exports only in approved locations.
- Delete local exports when the ticket or review no longer needs them.
- Do not paste raw source JSON into public chat.
- Never commit `.env`, signing keys, exported secrets, or database files.

For Graph permissions, trust boundaries, and the threat model, see
[docs/security-report.md](./security-report.md) and [SECURITY.md](../SECURITY.md).

## Troubleshooting Runway itself

### App shows mock data

Likely causes:

- Graph credentials are missing.
- `SEED_MODE=mock` is set.
- The app was started with an empty database and no live credentials.

Response:

1. Open Settings → Graph Integration.
2. Confirm `.env` values.
3. Set `SEED_MODE=none` for live validation.
4. Restart and sync.

### Sync pill shows "Sync failed"

Response:

1. Click the pill to read the error message.
2. Open Sync for the full sync log.
3. Open Settings → Recent Logs.
4. Confirm Graph credentials and permissions.
5. Check [docs/troubleshooting.md](./troubleshooting.md).
6. Escalate with exact error text.

### Sync pill shows "Never synced" after setup

Response:

1. Confirm the user is signed in as a delegated admin (manual sync
   requires it).
2. Click the pill and choose **Run sync**.
3. If the sync completes but device count remains zero, confirm the
   tenant actually contains Autopilot or Intune devices.

### Remote actions are unavailable

Likely causes:

- Admin is not signed in.
- Delegated token expired.
- Required Graph delegated permissions are missing.
- Device lacks Intune enrollment.
- Action is not valid for that source record.

Response:

1. Sign in again.
2. Confirm the device has an Intune ID.
3. Check Action Audit.
4. Check Settings → Recent Logs.

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

1. Read the sync status pill.
2. Run sync.
3. Confirm the Microsoft admin center reflects the expected change.
4. Wait for Microsoft service propagation if the change was recent.
5. Reopen the device detail page.

### Build Payload says "Assignment data not synced"

Response:

1. Run a sync. Build Payload depends on Graph assignment ingestion.
2. If the issue persists after a successful sync, confirm Graph app
   permissions include `DeviceManagementConfiguration.Read.All`.
3. Check Recent Logs for assignment sync errors.

## Glossary

| Term | Meaning |
| --- | --- |
| Autopilot | Microsoft Windows provisioning service based on registered hardware records. |
| BitLocker | Windows disk encryption. Runway can retrieve recovery keys when allowed. |
| Build Payload | The required apps, configuration profiles, and compliance policies that an Intune assignment resolves to for a target group. |
| ConfigMgr/SCCM | Microsoft Configuration Manager. Runway only shows client presence reported by Intune. |
| Delegated auth | A signed-in admin user's Microsoft Graph session for actions and secrets. |
| EntityPicker | The search-by-name/UPN/mail user picker used by Change Primary User and similar flows. |
| Entra ID | Microsoft identity platform formerly known as Azure Active Directory. |
| Graph | Microsoft Graph API used to read and act on Microsoft cloud resources. |
| Group tag | Autopilot hardware-order/group-tag value used to route devices. |
| Intune | Microsoft endpoint management service. |
| LAPS | Local Administrator Password Solution. |
| OOBE | Windows out-of-box experience during provisioning. |
| Problem area | Runway's grouping of flags into Identity, Targeting, Enrollment, and Drift. Also called a breakpoint internally. |
| Profile | Windows Autopilot deployment profile. |
| Sync status pill | The persistent freshness indicator in the top bar; click it for last-sync details and the manual sync button. |
| Tag mapping | Runway dictionary connecting group tags to expected properties, groups, and profiles. |
| ZTDID | Zero Touch Deployment ID used in Autopilot/Entra correlation. |
