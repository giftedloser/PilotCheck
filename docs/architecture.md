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
- **Fast queries on cold cache** — SQLite + WAL on a local SSD answers a
  600-device dashboard query in single-digit milliseconds.
- **Offline development** — mock seed mode lets the entire UI be developed
  and demoed without a Graph tenant.

## Key tables

| Table                  | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `raw_autopilot`        | Verbatim Autopilot device identity records              |
| `raw_intune`           | Verbatim Intune managed device records                  |
| `raw_intune_profile`   | Autopilot deployment profile assignments                |
| `raw_entra_device`     | Entra device objects                                    |
| `raw_entra_group`      | Entra groups + dynamic membership rules                 |
| `raw_entra_group_member` | Group membership join table                           |
| `device_state`         | Computed per-device snapshot (health, flags, diagnosis) |
| `device_state_history` | Transition-only history of `device_state`               |
| `tag_config`           | Group-tag → expected profile/group dictionary           |
| `rules`                | User-defined rule definitions (predicate DSL)           |
| `sync_log`             | One row per sync attempt                                |
| `action_log`           | One row per remote action dispatched                    |

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
`configurationManager` as a positive ConfigMgr/co-management signal. This is
enough to answer "does Intune see this device as ConfigMgr/co-managed?", but it
does not replace a site-server health check for policy, inventory, or client
assignment.

## State transitions

`device_state_history` is the foundation for every "what changed" view.
Because rows are only written on transitions, you can answer questions like
"what regressed in the last 24h" with a single indexed range scan and
without scanning a per-day-per-device matrix.

The dashboard's 14-day trend chart computes each daily bucket as
"the most recent `device_state_history` row per device on or before the end
of day N", which is O(devices × days) — trivial for a few hundred devices
over two weeks.
