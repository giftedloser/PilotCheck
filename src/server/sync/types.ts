import type {
  AutopilotRow,
  CompliancePolicyRow,
  ConfigProfileRow,
  DeviceComplianceStateRow,
  DeviceConfigStateRow,
  EntraRow,
  GroupMembershipRow,
  GroupRow,
  IntuneRow,
  ProfileAssignmentRow,
  ProfileRow
} from "../db/types.js";

export interface SnapshotPayload {
  autopilotRows: AutopilotRow[];
  intuneRows: IntuneRow[];
  entraRows: EntraRow[];
  groupRows: GroupRow[];
  membershipRows: GroupMembershipRow[];
  profileRows: ProfileRow[];
  profileAssignmentRows: ProfileAssignmentRow[];
  compliancePolicies?: CompliancePolicyRow[];
  deviceComplianceStates?: DeviceComplianceStateRow[];
  configProfiles?: ConfigProfileRow[];
  deviceConfigStates?: DeviceConfigStateRow[];
  tagConfigRows?: Array<{
    groupTag: string;
    expectedProfileNames: string[];
    expectedGroupNames: string[];
    propertyLabel: string;
  }>;
}
