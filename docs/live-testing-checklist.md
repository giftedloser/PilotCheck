# Live Testing Checklist

Use this before connecting Runway to a real tenant. The goal is to prove the app can read safely, explain what it sees, and avoid surprise writes.

## 1. Local Workstation Preflight

- Confirm Node.js `24.14+` and npm `11+` are installed.
- Run `npm ci`.
- Run `npm run check`.
- Run `npm run build`.
- Confirm `.env` is not staged with `git status --short`.
- Set `SESSION_SECRET` to a long random value before live testing.
- Keep `APP_ACCESS_MODE=entra` for pilot runs. It activates once Graph
  credentials are configured; use `disabled` only for a documented local/dev
  exception.
- Use `SEED_MODE=none` when you want to verify only live tenant data.
- Keep `DATABASE_PATH` on an encrypted disk such as BitLocker-protected storage.

## 2. Entra App Registration

- Confirm the app registration tenant ID matches the tenant you will test.
- Confirm redirect URI is `http://localhost:3001/api/auth/callback`.
- Confirm the client secret is current and stored only in `.env`.
- Grant admin consent for the application permissions listed in `README.md`.
- Grant admin consent for delegated permissions if testing admin sign-in, LAPS, BitLocker, or remote actions.
- Confirm the account used for delegated testing has the Entra/Intune roles needed for the action being tested.

## 3. Intune / Autopilot Samples

Pick a small pilot set before syncing the full fleet:

- One healthy Autopilot device with an assigned profile.
- One device with an Autopilot record but no Intune enrollment yet.
- One Intune-managed device with a matching Entra device object.
- One known stale/orphaned device if available.
- One device with a known group tag and expected profile mapping.
- One device with a known mismatched tag/profile if available.
- One device with BitLocker recovery key available.
- One Windows LAPS-enabled device if delegated LAPS retrieval will be tested.

## 4. SCCM / ConfigMgr Signal

Runway does not connect directly to SCCM. It reads Intune's `managedDevice.managementAgent` value and marks devices that report a Configuration Manager client.

- In Settings, enable `SCCM / ConfigMgr Signal`.
- Pick one known co-managed or ConfigMgr-client device.
- Pick one Intune-only device.
- Pick one device with no Intune record if you have one in the pilot set.
- In Graph Explorer, validate the raw value with:
  `GET https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$filter=contains(deviceName,'DEVICE-NAME')&$select=deviceName,serialNumber,managementAgent,lastSyncDateTime`
- Confirm a ConfigMgr/co-managed device shows `ConfigMgr client reported` and a `managementAgent` value containing `configurationManager`.
- Confirm an Intune-only device shows `ConfigMgr client not reported` when `managementAgent` is present but does not contain `configurationManager`.
- Confirm a device with no Intune record shows `Cannot determine`, not a false SCCM failure.
- Confirm a device whose Intune record omits `managementAgent` shows `Not reported by Intune`, not a false SCCM failure.
- Confirm there are no SCCM action buttons; this feature is visibility-only.

## 5. First-run Setup

- On a fresh database, open `/setup` and walk all three steps.
- Step 1: enter tenant ID, client ID, and a real client secret (or
  certificate) through the Graph credentials wizard. Confirm the wizard
  rejects placeholder secrets.
- Step 2: run the initial sync and confirm at least one device row
  appears. If the sync completes but no devices appear, the step should
  prompt for a re-sync.
- Step 3: add one tag mapping with group tag and property label only.
  Leave Advanced expected groups/profiles empty unless you specifically
  want to validate strict expectations on this run.
- Confirm the first-run banner clears once all three steps complete.

## 6. Sync Status Pill

- Confirm the pill in the top bar reflects the latest sync. Acceptable
  states: `Synced X ago`, `Syncing…`.
- After running a sync, click the pill and verify the freshness panel
  shows the last successful timestamp, in-progress flag, and any error.
- If sign-in is required, confirm the pill explains that manual sync
  needs delegated admin sign-in.

## 7. App Smoke Test

- Open the overview page and confirm dashboard counts load.
- Use master search to find a device by hostname, serial, Entra ID, and
  user where available.
- Open a device and confirm Graph, Intune, Entra, Autopilot, and SCCM
  badges match the expected source state.
- Open the playbooks for at least two flags and confirm they expand with
  useful next steps and portal/Graph references.
- Open the **Tags** view and confirm the discovered tag inventory loads.
  Open the side drawer for one tag and verify the Advanced expected
  groups/profiles disclosure is collapsed by default.
- Open **Provisioning Builder** for one configured tag, pick a target
  group, and confirm the **Build Payload** panel resolves apps,
  configuration profiles, and compliance policies. Verify the panel
  states are correct on a tag with no selection (no group), on a fresh
  database (not synced), and on a configured tag (resolved or confirmed
  empty).
- Open Settings and confirm Graph configured status, app access status,
  admin sign-in, Sync & Data, Tag Mapping (JSON import/export only),
  rules and thresholds, custom rules, and system health all load.
- Test admin sign-in with a delegated admin account using the sidebar
  control.
- Test sidebar sign-out and verify privileged actions and the Action
  Audit gate disable cleanly.

## 8. Safe Action Validation

Do not start with destructive actions. Confirmations are always enforced
on destructive actions — do not look for a toggle to disable them.

- Test a read-only flow first: dashboard, search, device detail,
  playbooks.
- Test delegated sign-in via the sidebar control.
- Test LAPS or BitLocker retrieval only on a known lab device.
- Test single-device sync on a known device.
- Test the Change Primary User EntityPicker on a lab device by searching
  the user's display name, UPN, and mail address. Confirm the action
  payload uses the picked Graph user ID. Do not paste raw GUIDs.
- Confirm action audit logs show who ran the action, when, target
  device, status, and error detail if any.
- Defer wipe, retire, Autopilot reset, rename, the delete cleanups, and
  bulk actions until the read-only and low-risk flows pass.

## 9. Rollback / Downgrade

Pilots that started on 1.5 and moved to 1.6 should keep these notes in
mind:

- Tag mapping edits live in the Tags side drawer. Settings only handles
  JSON import/export. To downgrade tag-mapping edits to a previous
  build, export the full mapping JSON from Settings before the change.
- The destructive-action confirmation toggle was removed in 1.6;
  destructive confirmations are always enforced. There is no setting to
  re-introduce the toggle.
- The unified `display.theme` setting replaces the older split between
  the sidebar theme cycler and the Settings dropdown. If a theme value
  on disk pre-dates 1.6 and is not recognised, Runway falls back to the
  default rather than crashing.

If you need to roll back to a previous Runway version, keep a copy of
`%LOCALAPPDATA%\com.giftedloser.pilotcheck\.env` and back up the SQLite
database from `data/` before downgrading.

## 10. Go / No-Go

Ready for broader pilot when:

- `npm run check` and `npm run build` pass.
- Live sync completes without unexpected permission errors.
- Mock-only data is not mixed into the live database unless intentionally
  seeded.
- At least five known devices match expected Graph/Intune/Entra/SCCM
  state.
- The first-run setup checklist completes without manual intervention.
- App access gate is enabled, or a documented single-operator/dev
  exception has been approved.
- Build Payload resolves correctly for at least one configured tag.
- Security review in `docs/security-report.md` has been accepted.
