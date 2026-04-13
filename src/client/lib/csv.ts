import type { DeviceListItem } from "./types.js";

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function devicesToCsv(items: DeviceListItem[]): string {
  const headers = [
    "deviceKey",
    "deviceName",
    "serialNumber",
    "health",
    "flags",
    "property",
    "assignedProfile",
    "lastCheckinAt"
  ];
  const lines = [headers.join(",")];
  for (const item of items) {
    lines.push(
      [
        csvEscape(item.deviceKey),
        csvEscape(item.deviceName),
        csvEscape(item.serialNumber),
        csvEscape(item.health),
        csvEscape(item.flags.join("|")),
        csvEscape(item.propertyLabel),
        csvEscape(item.assignedProfileName),
        csvEscape(item.lastCheckinAt)
      ].join(",")
    );
  }
  return lines.join("\r\n");
}
