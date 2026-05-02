# Runway UX Sanity Review — post v1.6

**Branch:** `codex/ux-sanity-review`
**Reviewer:** Claude (Opus 4.7), 2026-05-01
**Scope:** Honest UX review of the post-v1.6 surface area. Tiny copy/IA fixes
applied; no features, no schema, no auth changes, no design-system swap.

> **Update note (second pass):** the original review leaned on a code-mapping
> agent's summary for three surfaces I hadn't read directly. On follow-up
> reads I confirmed the agent was wrong on three counts: the bulk action bar
> *does* go through a real per-action confirm modal, ProvisioningBuilder
> warnings render once per warning (not three times), and the Custom Rules
> section is a fully built rule authoring + preview + CRUD UI, not a
> placeholder. Those claims are retracted below. The corresponding fixes I
> would have justified by them weren't made.
>
> **Codex follow-up:** closed the actionable pre-tenant-testing items from
> this report: setup now has e2e coverage for "sync succeeded but no device
> rows imported", the HelpTooltip reset control has its own Display &
> Behavior row, default-value hints are hidden when a setting is still on its
> default, and the changelog now records the UX polish.
>
> **Pre-tenant polish:** added a visible sidebar sign-out control for active
> admin sessions, clarified what Action Audit contains before sign-in,
> normalized sync button copy, and softened sidebar help icons so they read
> as theme-native controls instead of bright circular badges.

---

## Verdict

**READY FOR TENANT TESTING — with the small fixes on this branch merged.**

Runway already does the hard part: a single-device, Windows-only triage console
that pulls Autopilot, Intune, and Entra into one place, links out to the right
portal pages, and keeps remote actions narrow and confirmed. The flows hang
together. The remaining friction is mostly *labelling and information density*,
not missing capability or broken paths. Nothing on the current branch blocks a
real-tenant pilot.

---

## Top 5 UX findings (ranked)

1. **Setup steps 2 and 3 were the same action twice.** Step 2 said "Verify
   Graph permissions" with a Run-sync button; step 3 said "Run initial sync"
   with another Run-sync button. Both called the same mutation, gated on
   different conditions. A first-time admin reads this as "did I miss
   something?" — confidence-eroding on the very first screen. **Fixed on this
   branch:** merged into one "Run the initial sync" step that surfaces both
   conditions in its body. Stepper is now 4 steps, not 5.

2. **"Breakpoints" is dev jargon used as IT vocabulary.** The Dashboard card
   "Breakpoints" + DeviceDetail "Use breakpoint chips first…" overload a
   debugger term to mean "where the provisioning pipeline breaks." Clever for
   the author, opaque for an admin two weeks in. **Fixed on this branch:**
   user-visible copy renamed to "Problem areas" / "problem-area chips".
   Internal `BreakpointKey` type and `BREAKPOINT_BUCKETS` const were
   intentionally left alone — that's code-internal vocabulary and renaming it
   would balloon the diff for no UX gain.

3. **"Bulk mapping exchange" buries a routine action behind a phrase nobody
   says.** The Settings tag-mapping card title was the kind of copy that gets
   read once and then ignored. **Fixed on this branch:** "Import / export tag
   mappings" + a one-line explanation that points individual edits at the Tags
   view.

4. **Settings is one long page with 12 sections and a sticky JumpNav.** That's
   a lot, but it's *readable* because the JumpNav is sticky and section
   headers are numbered. I did **not** convert to top-tabs. Recommendation
   below — keep the page, do two small reorders next pass.

5. **Action Audit hard-gates behind admin sign-in before showing what it is.**
   A signed-out user gets a single card saying "sign in to see this" with no
   preview of what they'd be looking at. Reasonable for compliance, but a new
   admin won't know what they're signing in *for*. **Not fixed** (would be
   real product change). Recommend showing the column header strip or a
   one-paragraph "what's in here" panel above the gate card next pass.

---

## What works well

- **Dashboard signal density is right.** Six top metrics, then a health
  summary + trend, then "Problem areas" buckets that link straight into a
  filtered DeviceList. An admin starting their day has somewhere to land.
- **DeviceDetail tab default is smart.** Routes to the highest-severity
  bucket on open. Saves a click on every triage.
- **First-run path is sequential and honest.** The progress stepper, dimmed
  completed steps, and the "Finish first-run setup" banner on Dashboard all
  point at the same flow — no orphaned setup pages.
- **Remote actions stay single-device.** Bulk action bar in DeviceList covers
  sync / reboot / rotate-LAPS only, with a results dialog. No batch wipe, no
  batch retire — matches the "single-device targeted actions" north star.
- **Settings access tiers feel right.** Local display prefs are open;
  privileged controls are gated on admin sign-in with a clear "Sign in
  required" affordance; .env-controlled settings are read-only with a clear
  "Set by environment" badge. No fake controls.
- **SettingsReadinessBanner.** The 5-cell readiness card at the top of
  Settings is the single best piece of UX in the app — "Live data /
  Technician access / Admin session / SCCM signal / Tag mappings" tells you
  where you stand before you scroll.

---

## What feels confusing or noisy (still)

- **Sync is triggerable in three places.** Setup step 2, the Sync Data
  Settings section, and the Sync route. Not broken, but a returning admin
  wonders which is canonical. Recommend: keep all three but make the Sync
  Data section's button the primary one and the others say "Re-sync".
- **The four problem-area buckets share a colour with their *severity*, not
  their *category*.** Identity = info-blue, Targeting = warning-amber,
  Enrollment = critical-red, Drift = warning-amber. Looks like a severity
  scale but isn't. Either pick neutral category colours, or label the
  severity explicitly.
- **One existing inconsistency worth a future cleanup:** the settings control
  layout still mixes compact selects, buttons, and explanatory cards in a
  long single page. It is coherent enough for tenant testing, but worth a
  design pass if Settings grows again.

### Retracted (agent claims I couldn't reproduce)

- ~~"Bulk rotate-LAPS sits next to bulk sync with no extra confirmation."~~
  False. `components/devices/BulkActionConfirm.tsx` is a per-action modal
  with destructive flag, action-specific warning copy, and a two-phase
  confirm/run flow. Reboot is correctly marked destructive; rotate-LAPS is
  correctly marked non-destructive (it just rotates a password).
- ~~"Provisioning Builder warning copy repeats itself up to three times."~~
  False. `payload.warnings.map(...)` renders one `WarningWithGuidance` per
  warning, with `payloadWarningGuidance` called once per warning. No
  duplication.
- ~~"Custom Rules section is empty/WIP."~~ False. `RulesSection` is a fully
  built rule authoring form (field/op/value with type coercion), preview
  matches against the live snapshot, and CRUD with confirm-delete.

---

## Settings IA recommendation

**Recommendation: KEEP THE LONG PAGE.** Do not convert to top-tabs in this
pass. Reasons:

- The sticky JumpNav already gives you tab-like jumping without hiding
  context. Tabs would hide the readiness banner unless we duplicated it on
  every tab.
- Many sections are read-only/informational (Data Sources, System Health,
  About, Recent Logs). Hiding them behind tabs makes the IT director demo
  *less* impressive — you lose the "look at everything we surface" effect.
- Tab conversion is a real refactor: it would touch SettingsJumpNav,
  ScrollSpy logic, deep-link IDs (`#display-behavior`, `#graph`, etc.), and
  every section component's expected layout. Not a tiny fix.

### What I did this pass (small, high-leverage)

Both done on this branch in commit `b8e7bd2`:

1. **Reordered so related sections are adjacent.** Custom Rules moved from
   slot 10 to slot 6, immediately under Rules & Thresholds. Recent Logs stays
   at slot 11, next to System Health & Retention at slot 10. Final order:

   1. Display & Behavior
   2. Graph Integration
   3. Sync & Data
   4. Tag Mapping
   5. Rules & Thresholds
   6. Custom Rules *(moved up from 10)*
   7. Access & Security *(was 6)*
   8. SCCM / ConfigMgr Signal *(was 7)*
   9. Data Sources *(was 8)*
   10. System Health & Retention *(was 9)*
   11. Recent Logs
   12. About

2. **Renamed two JumpNav labels** to match the section titles users see:
   - "Thresholds" → "Rules" *(matches "Rules & Thresholds" header)*
   - "Rules" → "Custom rules" *(disambiguates the second rules section)*

3. **Converted RulesSection and SystemHealthSection headers** to use the
   shared `SettingsSectionHeader` component instead of hand-rolled `09. ...`
   / `10. ...` headers. Both sections now match the rest of Settings
   visually (mono accent index + uppercase title + helper line) and section
   numbering is consistent across the page.

### If you ever do go to top-tabs

The cleanest grouping I'd propose, based on access tier and concern:

- **Display** — Display & Behavior, About *(local-only stuff)*
- **Sync & Data** — Graph Integration, Sync Data, Data Sources, System
  Health & Retention
- **Rules** — Rules & Thresholds, Custom Rules
- **Tags** — Tag Mapping
- **Access & Security** — Access & Security, SCCM / ConfigMgr Signal
- **Diagnostics** — Recent Logs

Six tabs, every existing section assigned, no orphans. But again, not now.

---

## Settings: cut / combine / rename / demote / keep

| Section | Action | Rationale |
|---|---|---|
| Display & Behavior | **Keep** | Mixed prefs but cohesive enough; "Show hidden help tips again" is the only odd-one-out and it's tiny. |
| Graph Integration | **Keep** | Load-bearing. The .env-restart wording is honest. |
| Sync Data | **Keep** | Make this the canonical sync trigger (see above). |
| Tag Mapping | **Keep, renamed** ✓ | Done on this branch — "Import / export tag mappings". |
| Rules & Thresholds | **Keep, JumpNav renamed** ✓ | Done on this branch — JumpNav reads "Rules"; section title still "Rules & Thresholds". |
| Custom Rules | **Keep, moved up + JumpNav renamed** ✓ | Done on this branch — moved to slot 6 next to Rules & Thresholds; JumpNav reads "Custom rules". The section is fully built (authoring + preview + CRUD), not WIP. |
| Access & Security | **Keep, renumbered to 7** ✓ | The delegated-scopes pill list is one of the best disclosures in the app. Don't demote it. |
| SCCM / ConfigMgr Signal | **Keep, renumbered to 8** ✓ | Single feature flag, honestly labeled. Could fold under "Data Sources" later if it stays binary forever. |
| Data Sources | **Keep, renumbered to 9** ✓ | Pure disclosure; valuable for "what does Runway actually read?" |
| System Health & Retention | **Keep, renumbered to 10** ✓ | Director-demo gold. Header now uses the shared `SettingsSectionHeader`. |
| Recent Logs | **Keep** | Already adjacent to System Health (slot 11). |
| About | **Keep** | Standard. |

Net: nothing cut, six sections renumbered, two reordered, two JumpNav
labels renamed, two custom headers normalised. All applied on this branch.

---

## Tenant-testing readiness

**Yes — with these caveats:**

- **Decide the canonical "Run sync" affordance** so support docs can point
  one place. (Sync is wired in three: setup step 2, Sync Data section, Sync
  route.)
- **Pre-populate the readiness banner expectations** — make sure the demo
  tenant has at least one tag mapping before the walkthrough so the banner
  shows "Live testing readiness looks good" instead of the warning state.

The destructive remote actions are appropriately gated and confirmed. The
read-only ingest path is clearly disclosed (Data Sources section + the
"Demo data" banner across the top in mock mode). Single-device scope is
consistent. No portal-bouncing for diagnosis — the deep-links to Intune/Entra
are *escape hatches*, not load-bearing.

The one gap I'd want covered before scaling beyond a small tenant pilot is
real test coverage on the rule engine and on remote actions (per the prior
test-suite gate memory). UX is fine; the trust gap is in the engine, not the
chrome.

---

## Tiny fixes made on this branch

### Commit `9868035` — copy / setup IA

| File | Change |
|---|---|
| [src/client/routes/setup.tsx](../src/client/routes/setup.tsx) | Merged steps 2 and 3 into a single "Run the initial sync" step. Updated `activeStep` derivation, `StepShell` numbering, page header description, and `STEPPER_LABELS`. |
| [src/client/routes/Dashboard.tsx](../src/client/routes/Dashboard.tsx) | Renamed "Breakpoints" card to "Problem areas" with a clearer one-liner. |
| [src/client/routes/DeviceDetail.tsx](../src/client/routes/DeviceDetail.tsx) | Renamed user-visible "breakpoint chips" copy to "problem-area chips". Internal `BreakpointKey` type intentionally unchanged. |
| [src/client/routes/Settings.tsx](../src/client/routes/Settings.tsx) | Renamed "Bulk mapping exchange" to "Import / export tag mappings"; tightened Settings page header description. |

### Commit `f50fe56` — sync pill + stat clarity

| File | Change |
|---|---|
| [src/client/components/layout/SyncStatusPill.tsx](../src/client/components/layout/SyncStatusPill.tsx) | Replaced minutes-only formatter with a laddered humanizer (just-now / Xm / Xh / Xd / Xw / Xmo / Xy ago). Stops a 4-day-old mock-data sync from rendering as "5922 min ago". |
| [src/client/routes/Dashboard.tsx](../src/client/routes/Dashboard.tsx) | "Attention / Outside target" stat → "Need attention / Critical, warning, or info". Matches the underlying count and reads as a label. |

### Commit `b8e7bd2` — Settings IA

| File | Change |
|---|---|
| [src/client/routes/Settings.tsx](../src/client/routes/Settings.tsx) | Reordered JSX so `RulesSection` renders right after `RulesThresholdsSection`. Renumbered inline section headers (SCCM 7→8, Sources 8→9). |
| [src/client/components/settings/AccessSecuritySection.tsx](../src/client/components/settings/AccessSecuritySection.tsx) | Index 6 → 7. |
| [src/client/components/settings/SystemHealthSection.tsx](../src/client/components/settings/SystemHealthSection.tsx) | Replaced hand-rolled "09. System Health & Retention" header with `SettingsSectionHeader index="10"`; refresh button moved into the `actions` slot. |
| [src/client/components/settings/RulesSection.tsx](../src/client/components/settings/RulesSection.tsx) | Replaced hand-rolled "10. Custom Rules" header with `SettingsSectionHeader index="6"`. |
| [src/client/components/settings/SettingsShared.tsx](../src/client/components/settings/SettingsShared.tsx) | `SETTINGS_NAV` reordered to match new section order; "Thresholds" → "Rules" and the second "Rules" → "Custom rules". |
| [src/client/routes/ProfileAudit.tsx](../src/client/routes/ProfileAudit.tsx) | Empty state now matches the dashed-border pattern used elsewhere; copy clarified to "No deployment profiles in the local cache. Run a sync to pull profile data from Intune." |

Each pass is a separate commit so any one of them can be reverted in
isolation.

### Codex follow-up patch — review caveats closed

| File | Change |
|---|---|
| [src/client/components/settings/DisplayBehaviorSection.tsx](../src/client/components/settings/DisplayBehaviorSection.tsx) | Moved "Show hidden help tips again" into a dedicated Help tips row instead of sharing the table-page-size note. |
| [src/client/components/settings/AppSettingControls.tsx](../src/client/components/settings/AppSettingControls.tsx) | Hid default-value hints when the setting is already using its default; kept default/restart/env context when it is actionable. |
| [test/client/shell-status.e2e.test.tsx](../test/client/shell-status.e2e.test.tsx) | Added coverage for the merged setup step when a sync has completed but no device rows imported. |
| [CHANGELOG.md](../CHANGELOG.md) | Added the UX sanity polish to `[Unreleased]`. |

### Pre-tenant polish patch

| File | Change |
|---|---|
| [src/client/components/layout/AuthIndicator.tsx](../src/client/components/layout/AuthIndicator.tsx) | Made active admin sign-out visible as a labeled sidebar footer button. |
| [src/client/routes/ActionAudit.tsx](../src/client/routes/ActionAudit.tsx) | Clarified the pre-sign-in gate with what Action Audit contains and why sign-in is required. |
| [src/client/routes/setup.tsx](../src/client/routes/setup.tsx) / [src/client/routes/SyncStatus.tsx](../src/client/routes/SyncStatus.tsx) | Normalized sync button copy: Setup says "Run initial sync" for first run; Sync page says "Run sync". |
| [src/client/components/shared/HelpTooltip.tsx](../src/client/components/shared/HelpTooltip.tsx) | Toned down sidebar help icon chrome for better theme parity. |

---

## Tests run

- `npm run lint` — clean
- `npm run typecheck` — clean
- `npm run test:e2e -- --run test/client/shell-status.e2e.test.tsx test/client/settings-tags-theme.e2e.test.tsx` — clean
- `npm run build` — clean
- Live preview verification on the running dev server (`/setup`, `/`,
  `/settings`, `/profiles`) — text snapshots and DOM-text assertions confirm
  all changes render in the right order with the right copy and no console
  errors. The `preview_screenshot` transport timed out repeatedly so visual
  verification fell back to accessibility-tree snapshots, which is the more
  reliable path for copy changes anyway.
- A focused e2e regression now covers the merged setup-step conditional
  (`syncReady = hasSync && hasDeviceRows`), including the "sync completed
  but no device rows imported" recovery copy.

---

## Judgment calls

- **Did not convert Settings to top-tabs** even though the brief listed it as
  an option. The JumpNav already does the navigability job; tabs would hide
  the readiness banner and would be a real refactor, not a tiny fix.
- **Did not rename the internal `BreakpointKey` type / `BREAKPOINT_BUCKETS`
  const.** Those are code vocabulary, not user vocabulary. Renaming would
  bloat the diff with no UX win.
- **Did not touch the four-bucket colour scheme** even though I think it's
  misleading (severity colours on category buckets). That's a visual-design
  decision that affects the icon palette consistency across the app — not a
  copy nit.
- **Did not split Display & Behavior into "Appearance" + "Behavior".** The
  combined section is dense but coherent, and splitting would push the
  section count from 12 to 13 — wrong direction.
- **Did not gate Action Audit's pre-sign-in card behind richer copy.** That
  needs a product call on whether to show schema previews to unauthenticated
  users.
- **Did not consolidate the three "Run sync" affordances.** Each one lives
  in a context that justifies it (first-run setup, Settings, Sync route).
  Picking a canonical one is a product call, not a copy fix.
- **Added focused coverage for** the merged setup-step conditional instead of
  waiting for a broader testing sprint, because that path directly affects
  first-run trust.
- **Tested only the system theme** in the preview. Other themes
  (light / OLED / slate / studio) and narrow-width breakpoints were not
  exercised. Worth a tab-through in QA before the v1.7 cut.

---

*End of report.*
