import { Router } from "express";
import type Database from "better-sqlite3";

export function groupsRouter(db: Database.Database) {
  const router = Router();

  // GET /api/groups — list all Autopilot-targeted groups
  router.get("/", (_request, response) => {
    const groups = db
      .prepare(
        `SELECT
           g.id,
           g.display_name,
           g.membership_rule,
           g.membership_type,
           COUNT(gm.member_device_id) AS member_count
         FROM groups g
         LEFT JOIN group_memberships gm ON gm.group_id = g.id
         GROUP BY g.id
         ORDER BY g.display_name`
      )
      .all() as Array<{
      id: string;
      display_name: string;
      membership_rule: string | null;
      membership_type: string;
      member_count: number;
    }>;

    // Count how many profiles target each group
    const profileAssignments = db
      .prepare(
        `SELECT pa.group_id, ap.display_name AS profile_name
         FROM autopilot_profile_assignments pa
         JOIN autopilot_profiles ap ON ap.id = pa.profile_id`
      )
      .all() as Array<{ group_id: string; profile_name: string }>;

    const profilesByGroup = new Map<string, string[]>();
    for (const pa of profileAssignments) {
      const existing = profilesByGroup.get(pa.group_id) ?? [];
      existing.push(pa.profile_name);
      profilesByGroup.set(pa.group_id, existing);
    }

    const result = groups.map((g) => ({
      groupId: g.id,
      groupName: g.display_name,
      membershipRule: g.membership_rule,
      membershipType: g.membership_type,
      memberCount: g.member_count,
      assignedProfiles: profilesByGroup.get(g.id) ?? []
    }));

    response.json(result);
  });

  // GET /api/groups/:groupId — group detail with members
  router.get("/:groupId", (request, response) => {
    const { groupId } = request.params;

    const group = db
      .prepare(`SELECT id, display_name, membership_rule, membership_type FROM groups WHERE id = ?`)
      .get(groupId) as { id: string; display_name: string; membership_rule: string | null; membership_type: string } | undefined;

    if (!group) {
      response.status(404).json({ message: "Group not found." });
      return;
    }

    // Get members with their device state
    const members = db
      .prepare(
        `SELECT
           ds.device_key, ds.device_name, ds.serial_number, ds.overall_health, ds.group_tag,
           ds.assigned_profile_name, ds.flag_count
         FROM group_memberships gm
         JOIN device_state ds ON ds.entra_id = gm.member_device_id
         WHERE gm.group_id = ?
         ORDER BY
           CASE ds.overall_health
             WHEN 'critical' THEN 0
             WHEN 'warning' THEN 1
             WHEN 'info' THEN 2
             WHEN 'healthy' THEN 3
             ELSE 4
           END,
           ds.flag_count DESC`
      )
      .all(groupId) as Array<{
      device_key: string;
      device_name: string | null;
      serial_number: string | null;
      overall_health: string;
      group_tag: string | null;
      assigned_profile_name: string | null;
      flag_count: number;
    }>;

    // Get profiles that target this group
    const profiles = db
      .prepare(
        `SELECT ap.id, ap.display_name, ap.deployment_mode
         FROM autopilot_profile_assignments pa
         JOIN autopilot_profiles ap ON ap.id = pa.profile_id
         WHERE pa.group_id = ?`
      )
      .all(groupId) as Array<{ id: string; display_name: string; deployment_mode: string | null }>;

    response.json({
      groupId: group.id,
      groupName: group.display_name,
      membershipRule: group.membership_rule,
      membershipType: group.membership_type,
      memberCount: members.length,
      assignedProfiles: profiles.map((p) => ({
        profileId: p.id,
        profileName: p.display_name,
        deploymentMode: p.deployment_mode
      })),
      members: members.map((m) => ({
        deviceKey: m.device_key,
        deviceName: m.device_name,
        serialNumber: m.serial_number,
        health: m.overall_health,
        groupTag: m.group_tag,
        assignedProfileName: m.assigned_profile_name,
        flagCount: m.flag_count
      }))
    });
  });

  // GET /api/groups/:groupId/check/:deviceKey — check if device is a member
  router.get("/:groupId/check/:deviceKey", (request, response) => {
    const { groupId, deviceKey } = request.params;

    const device = db
      .prepare(`SELECT entra_id, device_name, serial_number FROM device_state WHERE device_key = ?`)
      .get(deviceKey) as { entra_id: string | null; device_name: string | null; serial_number: string | null } | undefined;

    if (!device) {
      response.status(404).json({ message: "Device not found." });
      return;
    }
    if (!device.entra_id) {
      response.json({ isMember: false, reason: "Device has no Entra ID." });
      return;
    }

    const membership = db
      .prepare(`SELECT 1 FROM group_memberships WHERE group_id = ? AND member_device_id = ?`)
      .get(groupId, device.entra_id);

    response.json({
      isMember: Boolean(membership),
      deviceName: device.device_name,
      serialNumber: device.serial_number,
      entraId: device.entra_id
    });
  });

  return router;
}
