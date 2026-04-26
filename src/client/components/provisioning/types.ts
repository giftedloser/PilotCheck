export interface DiscoverResult {
  groupTag: string;
  deviceCount: number;
  matchingGroups: Array<{
    groupId: string;
    groupName: string;
    membershipRule: string | null;
    membershipType: string;
  }>;
  matchingProfiles: Array<{
    profileId: string;
    profileName: string;
    deploymentMode: string | null;
    viaGroupId: string;
  }>;
  existingConfig: {
    groupTag: string;
    propertyLabel: string;
    expectedProfileNames: string[];
    expectedGroupNames: string[];
  } | null;
}

export interface ValidateResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MatchingGroup {
  groupId: string;
  groupName: string;
  membershipRule: string | null;
  membershipType: string;
}

export interface MatchingProfile {
  profileId: string;
  profileName: string;
  deploymentMode: string | null;
  viaGroupId: string;
}
