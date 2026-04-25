import { Router } from "express";
import type Database from "better-sqlite3";

import { requireDelegatedAuth, getDelegatedToken, getDelegatedUser } from "../auth/auth-middleware.js";
import { getLapsPassword } from "../actions/laps.js";
import { logAction } from "../db/queries/actions.js";
import { getDeviceIdentity } from "../db/queries/devices.js";

export function lapsRouter(db: Database.Database) {
  const router = Router();

  router.use(requireDelegatedAuth);

  // GET /api/laps/:deviceKey
  router.get("/:deviceKey", async (request, response) => {
    const { deviceKey } = request.params;
    const token = getDelegatedToken(request);
    const user = getDelegatedUser(request);

    const device = getDeviceIdentity(db, deviceKey);

    if (!device) {
      response.status(404).json({ message: "Device not found." });
      return;
    }
    if (!device.entra_id) {
      response.status(400).json({ message: "Device has no Entra ID. Cannot retrieve LAPS password." });
      return;
    }

    try {
      const result = await getLapsPassword(token, device.entra_id);

      // Log the LAPS retrieval
      logAction(db, {
        deviceSerial: device.serial_number,
        deviceName: device.device_name,
        intuneId: null,
        actionType: "laps_view",
        triggeredBy: user,
        triggeredAt: new Date().toISOString(),
        graphResponseStatus: result.status,
        notes: result.success ? "Password retrieved" : result.message
      });

      if (!result.success) {
        response.status(result.status === 404 ? 404 : 500).json({ message: result.message });
        return;
      }

      response.json(result.credential);
    } catch (error) {
      response.status(500).json({
        message: error instanceof Error ? error.message : "Failed to retrieve LAPS password."
      });
    }
  });

  return router;
}
