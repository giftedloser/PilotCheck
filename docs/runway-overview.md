# Runway

A local-first triage console for Windows Autopilot, Intune, and Entra ID.

---

## The problem

Provisioning a Windows device is a multi-system handshake: Autopilot →
Entra group → assigned profile → Intune enrollment → compliance.
When any link breaks, an admin opens three or four portals, copies
serial numbers between tabs, and pieces together what went wrong.
That investigation is the slowest part of the work, and it has to
happen for every stuck device.

Runway collapses those portals into one pane and tells the operator
*which link broke*, *which device it broke on*, and *what to do next*.

## What it is

A self-hosted Windows desktop app. The operator points it at their
own Entra tenant, it ingests Autopilot / Intune / Entra data through
Microsoft Graph, correlates the records, and surfaces drift, identity
conflicts, and provisioning failures. Everything runs on the operator's
machine — there is no Runway cloud, no telemetry, no third-party data
processor.

| | |
|---|---|
| Platform | Windows 11 / 10 (Tauri desktop shell) |
| Data sources | Autopilot, Intune, Entra ID, Graph-derived ConfigMgr presence |
| Data residency | Local SQLite on the operator's machine |
| Auth | Bring-your-own Entra app registration |
| Network egress | `login.microsoftonline.com` and `graph.microsoft.com` only |

## How a tech uses it

A 60-second triage flow:

1. **Open Runway.** Fleet Health dashboard shows new failures in the last
   24h, the top failure pattern, and a 14-day health trend.
2. **Click a queue tile** ("Critical now", "Targeting breaks", "Enrollment
   stalls"). The device list filters to just those failures.
3. **Click a device.** Breakpoint chips show *exactly* where it fell off
   the rails — Identity, Targeting, Enrollment, or Drift — with a
   "Next Best Action" card and a join-picture pipeline view.
4. **Run the playbook.** Each diagnostic includes a one-click *Open* link
   into the right Intune/Entra blade and a *Copy Command* button for the
   PowerShell or Graph call that fixes it.
5. **Take action.** Sync, reboot, rotate LAPS, retrieve BitLocker keys, or
   bulk-act across the whole queue — all logged to the audit trail.

## What Runway catches

**Identity & correlation**
- Missing ZTDID — device lacks the zero-touch ID that ties it to Autopilot
- Identity conflicts — Autopilot/Intune/Entra disagree on the same device
- Orphaned Autopilot records — registered in Autopilot, never enrolled
- Weak joins — name-only correlation that should be hardware-anchored

**Targeting & profile assignment**
- Device not in the target Entra group (dynamic-membership rule miss)
- No Autopilot profile assigned despite enrollment
- Profile assignment failed in Intune
- Group-tag mismatch vs. the configured property mapping
- Deployment-mode mismatch (self-deploying vs. user-driven, etc.)

**Enrollment & provisioning**
- Provisioning stalled past the SLA window
- "Assigned but not enrolled" — profile landed, Intune never completed
- Hybrid-join trust-type mismatch causing OOBE to hang

**Compliance & drift**
- Compliance regressions since last healthy snapshot
- User mismatch between Autopilot-assigned and Intune primary user

## Security posture

Runway was designed for IT teams that won't tolerate a new vendor in the
data path. Specifics:

- **No cloud, no telemetry.** There is no Runway service to attack.
  Tenant data never leaves the operator's workstation.
- **Bring-your-own credentials.** The installer ships with no Graph
  credentials. The operator registers their own Entra app and supplies
  the tenant ID, client ID, and client secret. They live in a per-user
  `%LOCALAPPDATA%\com.giftedloser.pilotcheck\.env` file, never in the
  installer or in git.
- **Loopback-only API.** Every `/api/*` route is gated by a local-access
  middleware. Mutating verbs additionally require a same-origin request
  so a stray browser tab on the same workstation can't pivot off
  operator cookies.
- **Rate-limited remote actions.** The `/api/actions/*` subtree is
  protected by a per-user token bucket (burst 30, sustained 1/s) so a
  runaway client can't burn Graph quota.
- **Signed sessions.** Delegated admin sessions ride a signed cookie
  with a 256-bit secret auto-generated on first run. The server refuses
  to start in production with the built-in default.
- **Restrictive desktop CSP.** The Tauri shell loads only the local
  runtime and grants a narrow window-control capability for the custom
  title bar — nothing else.
- **Read-only ConfigMgr.** SCCM presence is derived from Intune's
  `managementAgent` field. Runway does not store SCCM credentials and
  does not execute SCCM actions.
- **Audit trail.** Every remote action is logged with operator identity,
  HTTP status, and bulk-run grouping.

The full report — including the threat model, scoped risks, and
acknowledged dependency advisories — is in
[docs/security-report.md](security-report.md).

## Quality status

- **256 / 256 tests passing** (unit + API integration), covering the
  rule engine, sync service, auth flow, remote actions, idempotency,
  rate limiting, and route coverage.
- **TypeScript clean** (`tsc --noEmit`).
- **Lint clean** (`eslint .`).
- **Build clean** — production client (~400 KB) and server (~234 KB)
  bundle without warnings.
- **Mock mode** is loud and obvious (amber banner, "Mock mode — showing
  seeded sample data") so demo data can never be mistaken for live data.

## Where it goes from here

Runway today is a triage console. The natural next step is automation:
auto-remediation rules, scheduled sync, and a planned migration of the
Graph auth flow from confidential-client to PKCE public-client so the
deployment story stops requiring a per-tenant client secret. The roadmap
is in [`CHANGELOG.md`](../CHANGELOG.md).
