const INTUNE_BASE = "https://intune.microsoft.com/#view/";
const ENTRA_BASE = "https://entra.microsoft.com/#view/";

function encode(value: string) {
  return encodeURIComponent(value);
}

export function intuneDeviceUrl(intuneDeviceId: string, section = "overview") {
  return `${INTUNE_BASE}Microsoft_Intune_Devices/DeviceSettingsMenuBlade/~/${section}/mdmDeviceId/${encode(intuneDeviceId)}`;
}

export function intuneAppUrl(appId: string) {
  return `${INTUNE_BASE}Microsoft_Intune_Apps/SettingsMenu/~/0/appId/${encode(appId)}`;
}

export function intuneConfigProfileUrl(profileId: string) {
  return `${INTUNE_BASE}Microsoft_Intune_DeviceSettings/DevicesMenu/~/configuration/profileId/${encode(profileId)}`;
}

export function intuneCompliancePolicyUrl(policyId: string) {
  return `${INTUNE_BASE}Microsoft_Intune_DeviceCompliance/PoliciesMenu/~/policy/id/${encode(policyId)}`;
}

export function intuneGroupAssignmentsUrl(groupId: string) {
  return `${INTUNE_BASE}Microsoft_Intune_Apps/AssignmentsBlade/groupId/${encode(groupId)}`;
}

export function entraUserUrl(userIdOrUpn: string) {
  return `${ENTRA_BASE}Microsoft_AAD_UsersAndTenants/UserProfileMenuBlade/~/overview/userId/${encode(userIdOrUpn)}`;
}

export function entraGroupUrl(groupId: string) {
  return `${ENTRA_BASE}Microsoft_AAD_IAM/GroupDetailsMenuBlade/~/Overview/groupId/${encode(groupId)}`;
}

export function entraDeviceUrl(entraDeviceId: string) {
  return `${ENTRA_BASE}Microsoft_AAD_Devices/DeviceDetailsMenuBlade/~/Properties/objectId/${encode(entraDeviceId)}`;
}

export function autopilotProfileUrl(profileId: string) {
  return `${INTUNE_BASE}Microsoft_Intune_Enrollment/AutopilotProfileMenuBlade/~/properties/profileId/${encode(profileId)}`;
}

export function autopilotDeviceUrl(autopilotDeviceId: string) {
  return `${INTUNE_BASE}Microsoft_Intune_Enrollment/AutopilotDevicesBlade/deviceId/${encode(autopilotDeviceId)}`;
}

export const intuneAutopilotDevicesUrl =
  `${INTUNE_BASE}Microsoft_Intune_Enrollment/AutopilotDevicesBlade`;
export const intuneAutopilotProfilesUrl =
  `${INTUNE_BASE}Microsoft_Intune_Enrollment/AutopilotProfilesBlade`;
export const intuneAllDevicesUrl =
  `${INTUNE_BASE}Microsoft_Intune_Devices/DevicesMenu/~/allDevices`;
export const intuneEnrollmentStatusUrl =
  `${INTUNE_BASE}Microsoft_Intune_Enrollment/EnrollmentMenu/~/enrollmentStatus`;
export const intuneConnectorUrl =
  `${INTUNE_BASE}Microsoft_Intune_Enrollment/AutopilotIntuneConnectorBlade`;
export const entraGroupsUrl =
  `${ENTRA_BASE}Microsoft_AAD_IAM/GroupsManagementMenuBlade/~/AllGroups`;
