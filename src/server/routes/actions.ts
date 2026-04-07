import { Router } from "express";
import type Database from "better-sqlite3";

import { requireDelegatedAuth, getDelegatedToken, getDelegatedUser } from "../auth/auth-middleware.js";
import {
  syncDevice,
  rebootDevice,
  renameDevice,
  autopilotReset,
  retireDevice,
  wipeDevice,
  rotateLapsPassword
} from "../actions/remote-actions.js";
import { logAction } from "../db/queries/actions.js";

function getDeviceInfo(db: Database.Database, deviceKey: string) {
  return db
    .prepare(
      `SELECT serial_number, device_name, intune_id FROM device_state WHERE device_key = ?`
    )
    .get(deviceKey) as { serial_number: string | null; device_name: string | null; intune_id: string | null } | undefined;
}

export function actionsRouter(db: Database.Database) {
  const router = Router();

  // All action routes require delegated auth
  router.use(requireDelegatedAuth);

  // POST /api/actions/:deviceKey/:action
  router.post("/:deviceKey/:action", async (request, response) => {
    const { deviceKey, action } = request.params;
    const token = getDelegatedToken(request);
    const user = getDelegatedUser(request);

    const device = getDeviceInfo(db, deviceKey);
    if (!device) {
      response.status(404).json({ message: "Device not found." });
      return;
    }
    if (!device.intune_id) {
      response.status(400).json({ message: "Device has no Intune enrollment. Cannot execute remote actions." });
      return;
    }

    let result: { success: boolean; status: number; message: string };

    try {
      switch (action) {
        case "sync":
          result = await syncDevice(token, device.intune_id);
          break;
        case "reboot":
          result = await rebootDevice(token, device.intune_id);
          break;
        case "rename": {
          const newName = request.body?.deviceName;
          if (!newName || typeof newName !== "string") {
            response.status(400).json({ message: "deviceName is required." });
            return;
          }
          result = await renameDevice(token, device.intune_id, newName);
          break;
        }
        case "autopilot-reset":
          result = await autopilotReset(token, device.intune_id);
          break;
        case "retire":
          result = await retireDevice(token, device.intune_id);
          break;
        case "wipe":
          result = await wipeDevice(token, device.intune_id);
          break;
        case "rotate-laps":
          result = await rotateLapsPassword(token, device.intune_id);
          break;
        default:
          response.status(400).json({ message: `Unknown action: ${action}` });
          return;
      }
    } catch (error) {
      result = {
        success: false,
        status: 500,
        message: error instanceof Error ? error.message : "Action failed."
      };
    }

    // Log the action
    logAction(db, {
      deviceSerial: device.serial_number,
      deviceName: device.device_name,
      intuneId: device.intune_id,
      actionType: action,
      triggeredBy: user,
      triggeredAt: new Date().toISOString(),
      graphResponseStatus: result.status,
      notes: result.message
    });

    const httpStatus = result.success ? 200 : result.status >= 400 ? result.status : 500;
    response.status(httpStatus).json(result);
  });

  return router;
}
