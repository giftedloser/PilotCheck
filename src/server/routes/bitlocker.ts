import { Router } from "express";
import type Database from "better-sqlite3";

import { requireDelegatedAuth, getDelegatedToken, getDelegatedUser } from "../auth/auth-middleware.js";
import { getBitLockerKeys } from "../actions/bitlocker.js";
import { logAction } from "../db/queries/actions.js";

export function bitlockerRouter(db: Database.Database) {
  const router = Router();

  router.use(requireDelegatedAuth);

  // GET /api/bitlocker/:deviceKey
  router.get("/:deviceKey", async (request, response) => {
    const { deviceKey } = request.params;
    const token = getDelegatedToken(request);
    const user = getDelegatedUser(request);

    const device = db
      .prepare(
        `SELECT serial_number, device_name, entra_id FROM device_state WHERE device_key = ?`
      )
      .get(deviceKey) as { serial_number: string | null; device_name: string | null; entra_id: string | null } | undefined;

    if (!device) {
      response.status(404).json({ message: "Device not found." });
      return;
    }
    if (!device.entra_id) {
      response.status(400).json({ message: "Device has no Entra ID. Cannot retrieve BitLocker keys." });
      return;
    }

    try {
      const result = await getBitLockerKeys(token, device.entra_id);

      logAction(db, {
        deviceSerial: device.serial_number,
        deviceName: device.device_name,
        intuneId: null,
        actionType: "bitlocker_view",
        triggeredBy: user,
        triggeredAt: new Date().toISOString(),
        graphResponseStatus: result.status,
        notes: result.success ? `${result.keys.length} key(s) retrieved` : result.message
      });

      if (!result.success) {
        response.status(result.keys.length === 0 ? 404 : 500).json({ message: result.message });
        return;
      }

      response.json(result.keys);
    } catch (error) {
      response.status(500).json({
        message: error instanceof Error ? error.message : "Failed to retrieve BitLocker keys."
      });
    }
  });

  return router;
}
