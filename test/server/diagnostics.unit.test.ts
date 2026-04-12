import { describe, expect, it } from "vitest";

import { buildFlagExplanations } from "../../src/server/engine/diagnostics.js";
import type { AssignmentPath, FlagCode, MatchConfidence } from "../../src/shared/types.js";

const baseAssignmentPath: AssignmentPath = {
  autopilotRecord: null,
  targetingGroups: [],
  assignedProfile: null,
  effectiveMode: null,
  chainComplete: false,
  breakPoint: "no_record"
};

function makeContext(overrides: {
  matchConfidence?: MatchConfidence;
  identityConflict?: boolean;
} = {}) {
  return {
    deviceName: "DESKTOP-01",
    serialNumber: "CZC123",
    trustType: "AzureAd",
    groupTag: "LOBBY",
    assignedProfileName: "LOBBY-Kiosk",
    profileAssignmentStatus: "assigned",
    autopilotAssignedUserUpn: "alice@corp.example",
    intunePrimaryUserUpn: "bob@corp.example",
    assignmentPath: baseAssignmentPath,
    lastCheckinAt: null,
    complianceState: null,
    matchConfidence: overrides.matchConfidence ?? "high",
    identityConflict: overrides.identityConflict ?? false
  };
}

describe("diagnostic caveats", () => {
  const crossSystemFlags: FlagCode[] = [
    "no_autopilot_record",
    "user_mismatch",
    "hybrid_join_risk",
    "orphaned_autopilot",
    "missing_ztdid",
    "deployment_mode_mismatch",
    "not_in_target_group",
    "tag_mismatch"
  ];

  const sameSystemFlags: FlagCode[] = [
    "compliance_drift",
    "no_profile_assigned",
    "profile_assignment_failed",
    "identity_conflict"
  ];

  it("injects a low-confidence caveat on all cross-system flags", () => {
    const context = makeContext({ matchConfidence: "low" });
    const explanations = buildFlagExplanations(crossSystemFlags, context);

    for (const explanation of explanations) {
      expect(explanation.caveat, `${explanation.code} should have a caveat`).not.toBeNull();
      expect(explanation.caveat).toContain("display name only");
    }
  });

  it("injects an identity-conflict caveat on all cross-system flags", () => {
    const context = makeContext({ identityConflict: true });
    const explanations = buildFlagExplanations(crossSystemFlags, context);

    for (const explanation of explanations) {
      expect(explanation.caveat, `${explanation.code} should have a caveat`).not.toBeNull();
      expect(explanation.caveat).toContain("Identity conflict");
    }
  });

  it("does NOT inject a caveat on same-system or identity-inherent flags", () => {
    const context = makeContext({ matchConfidence: "low", identityConflict: true });
    const explanations = buildFlagExplanations(sameSystemFlags, context);

    for (const explanation of explanations) {
      expect(explanation.caveat, `${explanation.code} should NOT have a caveat`).toBeNull();
    }
  });

  it("returns null caveat when correlation is high and no conflict", () => {
    const context = makeContext({ matchConfidence: "high", identityConflict: false });
    const explanations = buildFlagExplanations(crossSystemFlags, context);

    for (const explanation of explanations) {
      expect(explanation.caveat, `${explanation.code} should not have a caveat`).toBeNull();
    }
  });

  it("prioritizes identity-conflict caveat over low-confidence caveat", () => {
    // When both conditions are true, the conflict message is more actionable.
    const context = makeContext({ matchConfidence: "low", identityConflict: true });
    const explanations = buildFlagExplanations(["user_mismatch"], context);
    expect(explanations[0].caveat).toContain("Identity conflict");
    expect(explanations[0].caveat).not.toContain("display name");
  });

  it("does NOT inject a caveat at medium confidence (medium is acceptable)", () => {
    const context = makeContext({ matchConfidence: "medium" });
    const explanations = buildFlagExplanations(crossSystemFlags, context);

    for (const explanation of explanations) {
      expect(explanation.caveat).toBeNull();
    }
  });
});
