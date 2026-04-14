# Provisioning Builder UI Handoff

Date: 2026-04-14
Owner: Codex
Audience: Claude continuing provisioning core logic work

## Scope

This pass was UI/UX only on the Provisioning Builder screen.

Changed file:

- `src/client/routes/ProvisioningBuilder.tsx`

No server routes, data contracts, query keys, request payloads, or validation logic were intentionally changed.

## What Changed

The Provisioning Builder page was reworked from a simple vertical stack of cards into a more admin-oriented review console:

- Stronger page header with source badges and clearer operational framing.
- New workflow hero section explaining the intended operator sequence.
- Tag search area tightened with better hierarchy and context.
- Added compact metric cards for:
  - devices with tag
  - matching groups
  - matching profiles
- Existing `tag_config` mapping now renders as a clearer reference section.
- Group selection cards were redesigned for faster scanning:
  - stronger selection state
  - membership rule in a dedicated block
  - clearer membership type labeling
- Profile selection cards were redesigned:
  - better readability
  - shows which discovered group the profile came through
  - unique UI key uses `profileId + viaGroupId` to avoid duplicate React key collisions in the view
- Added a persistent right-side review panel:
  - current tag
  - selected group
  - selected profile
  - validation action
- Validation results now render in a more explicit operator-facing output section:
  - success/failure banner
  - separated errors
  - separated warnings
  - cleaner empty state before validation runs
- Discovery loading and error states now use existing shared app components for consistency.
- Added Windows-admin convenience features:
  - operator readiness rail
  - expected-vs-selected comparison cues
  - exact ID/detail rows for selected group and profile
  - clipboard copy actions for tag, group ID, and profile ID
  - Windows-friendly deployment mode labels

## Intentional Non-Changes

The following were deliberately left alone:

- `src/server/routes/provisioning.ts`
- discovery query logic
- validation logic
- mutation/query wiring
- route registration
- sidebar registration
- backend schemas and migrations

If logic needs to change, that should be treated as a separate pass from this UI refactor.

## Build / Validation

Verified after the UI refactor:

- `npm run build:client`
- `npx eslint src/client/routes/ProvisioningBuilder.tsx`

Note: repo-wide lint still has unrelated pre-existing failures outside this screen.

## Next UI-Only Opportunities

If continuing UI polish without touching business logic, these are the highest-value next steps:

1. Add sticky section headers inside the group/profile result columns for long result sets.
2. Add lightweight empty-state guidance per scenario:
   - no devices for tag
   - groups found but no profiles
   - profiles found but no selected chain
3. Add scroll preservation inside the two result panes so switching selections does not feel jumpy on larger datasets.
4. Add a denser "table mode" or compact toggle if this screen starts handling larger enterprise tag inventories.
5. Add optional local-only filters in the UI:
   - expected groups only
   - expected profiles only
   - dynamic groups only
   - deployment mode chips
6. Add a printable/exportable operator summary card for ticket attachment or change review.

## Caution

The current UI is stronger, but some underlying behavior still needs logic review:

- validation can still report success with incomplete selections
- backend membership type normalization is inconsistent with the rest of the app
- profile discovery can still be semantically ambiguous when a profile is assigned through multiple matching groups

Those are logic concerns, not UI concerns, and were intentionally not changed in this pass.
