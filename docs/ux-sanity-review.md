# Runway UX Sanity Review — post v1.6

**Branch:** `codex/ux-sanity-review`
**Reviewer:** Claude (Opus 4.7), 2026-05-01
**Scope:** Honest UX review of the post-v1.6 surface area. Tiny copy/IA fixes
applied; no features, no schema, no auth changes, no design-system swap.

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
- **Custom Rules section (10) renders even when empty/WIP.** If the editor
  has no content yet, the section header still claims a "Custom Rules" slot.
  Either remove until it ships or add a "Coming soon — custom rule authoring"
  banner so admins don't think they're missing a feature.
- **Provisioning Builder warning copy repeats itself.** Same payload-warning
  guidance string is rendered up to three times in the build flow. Already
  factored into a helper but printed verbatim each time. Show once, link a
  "What does this mean?" disclosure.

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

### What I would do *next* pass (small, high-leverage)

1. **Reorder so related sections are adjacent.** Today the order is
   Display → Graph → Sync → Tags → **Rules-and-Thresholds** → Access → SCCM
   → Sources → Health → **Custom Rules** → Logs → About. The two rules
   sections are six apart. Bring "Custom Rules" up to sit immediately under
   "Rules & Thresholds". Same logic for Logs — it's a diagnostic and belongs
   next to System Health.

   Proposed order:
   1. Display & Behavior
   2. Graph Integration
   3. Sync Data
   4. Tag Mapping
   5. Rules & Thresholds
   6. Custom Rules *(moved up from 10)*
   7. Access & Security
   8. SCCM / ConfigMgr Signal
   9. Data Sources
   10. System Health & Retention
   11. Recent Logs *(stays)*
   12. About

2. **Rename two JumpNav labels** so they match the section titles users see:
   - "Thresholds" → "Rules" *(matches "Rules & Thresholds" header)*
   - "Rules" → "Custom rules" *(disambiguates the second rules section)*

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
| Tag Mapping | **Keep, renamed** ✓ | Already done on this branch — "Import / export tag mappings". |
| Rules & Thresholds | **Keep, JumpNav rename** | Suggest "Rules" in JumpNav; keep "Rules & Thresholds" as section title. |
| Access & Security | **Keep** | The delegated-scopes pill list is actually one of the best disclosures in the app. Don't demote it. |
| SCCM / ConfigMgr Signal | **Keep** | Single feature flag, honestly labeled. Could be folded under "Data Sources" later if the flag stays binary forever. |
| Data Sources | **Keep** | Pure disclosure; valuable for "what does Runway actually read?" |
| System Health & Retention | **Keep** | Director-demo gold. |
| Custom Rules | **Demote OR ship** | If still WIP, gate behind a "Coming soon" banner or hide. Don't ship empty section headers. |
| Recent Logs | **Keep, move next to Health** | Diagnostic neighbour. |
| About | **Keep** | Standard. |

Net: nothing to cut today, one to clarify (Custom Rules), two reorders, two
JumpNav label tweaks. All next-pass.

---

## Tenant-testing readiness

**Yes — with these caveats:**

- **Confirm Custom Rules state before a director demo.** If it's truly WIP,
  hide it or label it. An empty section will be the first thing a sceptical
  IT director clicks.
- **Decide the canonical "Run sync" affordance** so support docs can point
  one place.
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

| File | Change |
|---|---|
| [src/client/routes/setup.tsx](../src/client/routes/setup.tsx) | Merged steps 2 and 3 into a single "Run the initial sync" step. Updated `activeStep` derivation, `StepShell` numbering, page header description, and `STEPPER_LABELS`. |
| [src/client/routes/Dashboard.tsx](../src/client/routes/Dashboard.tsx) | Renamed "Breakpoints" card to "Problem areas" with a clearer one-liner. |
| [src/client/routes/DeviceDetail.tsx](../src/client/routes/DeviceDetail.tsx) | Renamed user-visible "breakpoint chips" copy to "problem-area chips". Internal `BreakpointKey` type intentionally unchanged. |
| [src/client/routes/Settings.tsx](../src/client/routes/Settings.tsx) | Renamed "Bulk mapping exchange" to "Import / export tag mappings"; tightened Settings page header description. |

All in one commit (`9868035`) so reverting the copy pass is a one-line
operation if you want to bikeshed wording before merge.

---

## Tests run

- `npm run lint` — clean
- `npm run typecheck` — clean
- Live preview verification on the running dev server (`/setup`, `/`,
  `/settings`) — text snapshots confirm all four edits render and no console
  errors. The `preview_screenshot` transport timed out repeatedly so visual
  verification fell back to accessibility-tree snapshots and DOM text
  assertions, which is the more reliable path for copy changes anyway.
- `npm run build` was **not** run because no compiled-output paths were
  touched — only client TSX copy strings.
- No new unit/e2e tests added (no behavior change).

---

## Judgment calls

- **Did not convert Settings to top-tabs** even though the brief listed it as
  an option. The JumpNav already does the navigability job; tabs would hide
  the readiness banner and would be a real refactor, not a tiny fix.
- **Did not rename the internal `BreakpointKey` type / `BREAKPOINT_BUCKETS`
  const.** Those are code vocabulary, not user vocabulary. Renaming would
  bloat the diff with no UX win.
- **Did not move the Custom Rules section.** That's a content/IA decision
  pending a product call on whether the feature is live, WIP, or cut. Flagged
  in the report instead.
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

---

*End of report.*
