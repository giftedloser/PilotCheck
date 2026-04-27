import type { DeviceDetailResponse } from "./types.js";

export type ConfigMgrSignalStatus =
  | "disabled"
  | "no_intune_record"
  | "not_reported"
  | "detected"
  | "not_detected";

export function formatManagementAgent(value: string | null | undefined) {
  if (!value) return "No managementAgent value reported";
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function getConfigMgrSignal(
  device: DeviceDetailResponse,
  enabled: boolean
): {
  status: ConfigMgrSignalStatus;
  label: string;
  detail: string;
  rawValue: string | null;
} {
  if (!enabled) {
    return {
      status: "disabled",
      label: "Signal disabled",
      detail: "Enable SCCM / ConfigMgr Signal in Settings.",
      rawValue: device.enrollment.managementAgent
    };
  }

  if (!device.identity.intuneId) {
    return {
      status: "no_intune_record",
      label: "Cannot determine",
      detail: "No Intune managed-device record exists, so Runway cannot read managementAgent.",
      rawValue: null
    };
  }

  if (!device.enrollment.managementAgent) {
    return {
      status: "not_reported",
      label: "Not reported by Intune",
      detail:
        "The device has an Intune record, but Graph did not return managementAgent. Verify Intune data freshness before treating this as disconnected.",
      rawValue: null
    };
  }

  if (device.enrollment.hasConfigMgrClient) {
    return {
      status: "detected",
      label: "ConfigMgr client reported",
      detail:
        "Intune reports a Configuration Manager management agent on this device. Presence only — this does not confirm site assignment, policy retrieval, or update authority.",
      rawValue: device.enrollment.managementAgent
    };
  }

  return {
    status: "not_detected",
    label: "ConfigMgr client not reported",
    detail:
      "Intune reports a management agent, but it is not a Configuration Manager value. The device may be missing the ConfigMgr client, or be managed by Intune-only policies.",
    rawValue: device.enrollment.managementAgent
  };
}
