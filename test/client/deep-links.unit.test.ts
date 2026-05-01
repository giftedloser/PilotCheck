import { describe, expect, it } from "vitest";

import {
  autopilotDeviceUrl,
  autopilotProfileUrl,
  entraDeviceUrl,
  entraGroupUrl,
  entraUserUrl,
  intuneAppUrl,
  intuneCompliancePolicyUrl,
  intuneConfigProfileUrl,
  intuneDeviceUrl,
  intuneGroupAssignmentsUrl,
} from "../../src/client/lib/deep-links.js";

describe("deep link helpers", () => {
  it("builds Microsoft portal URLs with encoded identifiers", () => {
    expect(intuneDeviceUrl("mdm id")).toContain("mdmDeviceId/mdm%20id");
    expect(intuneDeviceUrl("mdm-1", "compliance")).toContain("~/compliance/mdmDeviceId/mdm-1");
    expect(intuneAppUrl("app/1")).toContain("appId/app%2F1");
    expect(intuneConfigProfileUrl("cfg-1")).toContain("profileId/cfg-1");
    expect(intuneCompliancePolicyUrl("pol-1")).toContain("policy/id/pol-1");
    expect(intuneGroupAssignmentsUrl("grp-1")).toContain("groupId/grp-1");
    expect(entraUserUrl("user@example.test")).toContain("user%40example.test");
    expect(entraGroupUrl("grp-1")).toContain("groupId/grp-1");
    expect(entraDeviceUrl("entra-1")).toContain("objectId/entra-1");
    expect(autopilotProfileUrl("profile-1")).toContain("profileId/profile-1");
    expect(autopilotDeviceUrl("auto-1")).toContain("deviceId/auto-1");
  });
});
