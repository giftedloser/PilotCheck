# Architecture

Runway is a single-process Express server serving a React SPA, backed by
a local SQLite database. There is no message queue, no background worker, and
no external state — everything runs on one machine.

```
                ┌────────────────────────┐
                │   Microsoft Graph API  │
                └───────────┬────────────┘
                            │  app-only (sync)
                            │  delegated (actions / LAPS)
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     Runway server (Node)                 │
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐              │
│  │   sync   │ → │  engine  │ → │ device_state │              │
│  │ (Graph)  │   │ (rules)  │   │  (SQLite)    │              │
│  └──────────┘   └──────────┘   └──────┬───────┘              │
│                                       │                      │
│                                ┌──────▼───────┐              │
│                                │ Express API  │              │
│                                └──────┬───────┘              │
└───────────────────────────────────────┼──────────────────────┘
                                        │  HTTP/JSON
                                        ▼
                          ┌─────────────────────────┐
                          │   React SPA (Vite/TS)   │
                          │  TanStack Router/Query  │
                          └─────────────────────────┘
```

## Data flow

1. **Sync** runs every `SYNC_INTERVAL_MINUTES` (default 15) and on demand from
   the UI. It pulls Autopilot device identities, Intune managed devices,
   Intune deployment profiles, Entra devices, Entra groups, and group
   membership, and writes them verbatim into `raw_*` tables. Intune's
   `managedDevice.managementAgent` value is preserved as the v1 ConfigMgr/SCCM
   visibility signal. Failures are recorded in `sync_log`.
2. **Compute** runs immediately after every successful sync. It joins the raw
   tables into a per-device snapshot, evaluates the built-in flag rules and
   any user-defined rules, and writes one row per device into `device_state`.
3. **History** writes a row to `device_state_history` only when a device's
   health level *or* its set of active flags changes. This keeps history
   tiny while still letting the UI render transition timelines and the
   14-day fleet trend chart.
4. **Read paths** in `src/server/db/queries/` are pure SQL — the API layer is
   a thin shell around them.

## Why local-first

- **No tenancy story to maintain** — every install is a single tenant by
  definition. There is no Runway cloud, so there is nothing to breach.
- **Fast queries on cold cache** — SQLite + WAL on a local SSD answers
  dashboard queries in milliseconds at the device counts Runway is
  designed for.
- **Offline development** — mock seed mode lets the entire UI be developed
  and demoed without a Graph tenant.

## App-only sync vs delegated actions

Runway uses Microsoft Graph in two distinct modes that must not be
confused:

- **App-only (read).** The scheduled sync runs unattended with the
  client-credentials flow and pulls Autopilot, Intune, Entra, groups,
  profiles, assignments, compliance, and configuration. App-only
  permissions are listed in `README.md` and `docs/security-report.md`.
- **Delegated (write).** Remote actions, LAPS, BitLocker retrieval, the
  Action Audit page, and tag mapping edits run as the signed-in admin.
  Delegated scopes are requested dynamically and are intentionally
  separate from the app-only ingestion so reads and writes carry
  different trust levels.

## First-run completion criteria

The `/setup` checklist treats first run as complete when:

1. Graph is configured (tenant ID, client ID, and a non-placeholder
   secret or certificate).
2. A sync has succeeded **and** at least one device row was imported.
3. At least one tag mapping exists in `tag_config`.

The first-run banner in the workspace mirrors that state from
`useFirstRunStatus`. The setup page remains accessible from the sidebar
after first run so an admin can re-onboard or audit state at any time.

## Sync status source of truth

`sync_log` is the single source of truth for sync freshness. The status
pill, the freshness panel, the Sync page, and the setup checklist all
read from the same query: the most recent successful completion
timestamp, whether a sync is currently in progress, the last error
message, and whether the current session may trigger a manual sync.

Manual sync is gated on delegated admin sign-in. The pill and the setup
page surface that gate explicitly when sign-in is missing.

## Key tables

| Table                  | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `raw_autopilot`        | Verbatim Autopilot device identity records              |
| `raw_intune`           | Verbatim Intune managed device records                  |
| `raw_intune_profile`   | Autopilot deployment profile assignments                |
| `raw_entra_device`     | Entra device objects                                    |
| `raw_entra_group`      | Entra groups + dynamic membership rules                 |
| `raw_entra_group_member` | Group membership join table                           |
| `raw_graph_assignment` | Normalised Intune assignments (apps, configs, compliance) backing the Build Payload panel |
| `device_state`         | Computed per-device snapshot (health, flags, diagnosis) |
| `device_state_history` | Transition-only history of `device_state`               |
| `tag_config`           | Group-tag → property label + optional expected profile/group dictionary used to fire `tag_mismatch`, `not_in_target_group`, and `deployment_mode_mismatch` |
| `rules`                | User-defined rule definitions (predicate DSL)           |
| `app_settings`         | DB-backed app settings with DB / env / code-default precedence (theme, sync triggers, retention, etc.) |
| `user_views`           | Saved device-queue filter sets, including locked built-in presets |
| `sync_log`             | One row per sync attempt                                |
| `action_log`           | One row per remote action dispatched                    |

After the v1.5/v1.6 cleanup, `tag_config` stores the property label and
optional expected groups/profiles (Advanced fields). With no Advanced
expectations, expectation-based flags are suppressed for that tag — the
table is the single source of truth for both the discovered tag inventory
in the Tags view and the engine's expectation evaluation.

## API access model

Every request to `/api/*` passes through `requireLocalAccess`
([src/server/auth/local-access.ts](../src/server/auth/local-access.ts))
before hitting any route. A request is admitted when one of:

1. The `X-Runway-Desktop-Token` header matches the per-install token
   the Tauri shell generates and exposes via the `get_desktop_api_token`
   command.
2. The session has a valid delegated admin token (set after Microsoft
   sign-in).
3. The session has a valid Entra app-access user (set after the gate
   sign-in).

Mutating methods (POST/PUT/PATCH/DELETE) additionally require an `Origin`
that is loopback or `tauri://` so a stray browser tab on the same
workstation cannot pivot off the user's cookies. Within the actions
subtree, a per-user token-bucket limiter (burst 30, sustained 1/s)
prevents a runaway client from burning Graph quota.

The recompute scheduler
([src/server/engine/recompute-scheduler.ts](../src/server/engine/recompute-scheduler.ts))
debounces engine reruns triggered by rule and tag-config CRUD so route
handlers return immediately and the event loop stays responsive on
multi-thousand-device fleets.

## SCCM / ConfigMgr boundary

Runway v1 does not have a direct Configuration Manager connector. It does not
open AdminService, SQL, WMI, or PowerShell sessions to an SCCM site.

Instead, the sync layer reads Intune's `managedDevice.managementAgent` field
through Microsoft Graph. The engine treats values containing
`configurationManager` as a **client-presence** signal — i.e., Intune is
reporting a ConfigMgr management agent on the device. This answers "does
Intune say this device has a ConfigMgr client?" and nothing more. It is not a
client-health check, does not prove site assignment, policy retrieval,
inventory freshness, MP/DP reachability, software-update deployment
membership, or which authority (ConfigMgr vs Windows Update for Business) is
currently driving updates on the device. A direct ConfigMgr connector is on
the roadmap as an opt-in v-next feature; it is explicitly out of scope for
v1.

## State transitions

`device_state_history` is the foundation for every "what changed" view.
Because rows are only written on transitions, you can answer questions like
"what regressed in the last 24h" with a single indexed range scan and
without scanning a per-day-per-device matrix.

The dashboard's 14-day trend chart computes each daily bucket as
"the most recent `device_state_history` row per device on or before the end
of day N", which is O(devices × days) — trivial for a few hundred devices
over two weeks.

## Build Payload data flow

The Build Payload panel in Provisioning Builder reads from
`raw_graph_assignment`, populated by the assignment ingestion added in
1.5. The flow is:

1. Sync pulls Intune app, configuration profile, and compliance policy
   assignments via Graph and writes them into `raw_graph_assignment`.
2. The provisioning queries join those assignments against Entra group
   membership to resolve, for a given group, the set of required apps,
   configuration profiles, and compliance policies it actually receives.
3. The Build Payload panel surfaces four explicit availability states —
   no group selected, not synced, sync/error-unavailable, and confirmed
   empty — so the UI never silently shows "nothing here" when the truth
   is "we have not synced yet".

When the panel can resolve the payload, it also flags the cases where a
required app is missing, or the payload is reachable through *another*
discovered group rather than the selected one. Both warnings carry
"What now" guidance pointing the admin at the correct Intune blade.

## Limits and non-goals

The architecture intentionally rules out a number of capabilities:

- **No multi-tenant fan-out.** Each Runway install talks to one tenant.
  Multi-tenant support would require credential, schema, and audit
  changes that are out of scope.
- **No bulk destructive remediation.** Bulk actions are limited to
  `sync`, `reboot`, and `rotate-laps` and capped at 200 devices per
  request. Retire, wipe, Autopilot reset, rename, change primary user,
  and the delete cleanups are single-device clicks by design.
- **No policy authoring.** Runway never writes Autopilot deployment
  profiles, configuration profiles, compliance policies, conditional
  access policies, or group memberships. Fixes deep-link out to the
  appropriate Microsoft portal.
- **No SCCM connector.** ConfigMgr is presence-only via Intune's
  `managementAgent`. Runway does not open a site server connection.
- **No telemetry, no Runway cloud.** External egress is restricted to
  `login.microsoftonline.com` and `graph.microsoft.com`.
