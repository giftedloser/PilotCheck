import type Database from "better-sqlite3";

export interface ActionLogEntry {
  id: number;
  deviceSerial: string | null;
  deviceName: string | null;
  intuneId: string | null;
  actionType: string;
  triggeredBy: string;
  triggeredAt: string;
  graphResponseStatus: number | null;
  notes: string | null;
}

export function logAction(
  db: Database.Database,
  entry: Omit<ActionLogEntry, "id">
) {
  db.prepare(
    `INSERT INTO action_log (device_serial, device_name, intune_id, action_type, triggered_by, triggered_at, graph_response_status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    entry.deviceSerial,
    entry.deviceName,
    entry.intuneId,
    entry.actionType,
    entry.triggeredBy,
    entry.triggeredAt,
    entry.graphResponseStatus,
    entry.notes
  );
}

export function listActionLogs(
  db: Database.Database,
  limit = 50
): ActionLogEntry[] {
  const rows = db
    .prepare(
      `SELECT id, device_serial, device_name, intune_id, action_type, triggered_by, triggered_at, graph_response_status, notes
       FROM action_log ORDER BY triggered_at DESC LIMIT ?`
    )
    .all(limit) as Array<{
    id: number;
    device_serial: string | null;
    device_name: string | null;
    intune_id: string | null;
    action_type: string;
    triggered_by: string;
    triggered_at: string;
    graph_response_status: number | null;
    notes: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    deviceSerial: row.device_serial,
    deviceName: row.device_name,
    intuneId: row.intune_id,
    actionType: row.action_type,
    triggeredBy: row.triggered_by,
    triggeredAt: row.triggered_at,
    graphResponseStatus: row.graph_response_status,
    notes: row.notes
  }));
}

export function listDeviceActionLogs(
  db: Database.Database,
  serial: string,
  limit = 20
): ActionLogEntry[] {
  const rows = db
    .prepare(
      `SELECT id, device_serial, device_name, intune_id, action_type, triggered_by, triggered_at, graph_response_status, notes
       FROM action_log WHERE device_serial = ? ORDER BY triggered_at DESC LIMIT ?`
    )
    .all(serial, limit) as Array<{
    id: number;
    device_serial: string | null;
    device_name: string | null;
    intune_id: string | null;
    action_type: string;
    triggered_by: string;
    triggered_at: string;
    graph_response_status: number | null;
    notes: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    deviceSerial: row.device_serial,
    deviceName: row.device_name,
    intuneId: row.intune_id,
    actionType: row.action_type,
    triggeredBy: row.triggered_by,
    triggeredAt: row.triggered_at,
    graphResponseStatus: row.graph_response_status,
    notes: row.notes
  }));
}
