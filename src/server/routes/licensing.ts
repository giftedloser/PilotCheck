import { Router } from "express";
import type Database from "better-sqlite3";

import { requireDelegatedAuth, getDelegatedToken } from "../auth/auth-middleware.js";
import { requestWithDelegatedToken } from "../auth/delegated-auth.js";

interface GraphLicenseDetail {
  skuPartNumber: string;
  servicePlans: Array<{ servicePlanName: string; provisioningStatus: string }>;
}

interface GraphLicenseResponse {
  value: GraphLicenseDetail[];
}

interface LicensingResult {
  userUpn: string;
  licenses: Array<{
    skuPartNumber: string;
    servicePlans: Array<{ planName: string; status: string }>;
  }>;
  hasIntune: boolean;
  hasEntraP1: boolean;
  hasEntraP2: boolean;
}

export function licensingRouter(db: Database.Database) {
  const router = Router();

  router.use(requireDelegatedAuth);

  // GET /api/licensing/:deviceKey — check assigned user's licenses
  router.get("/:deviceKey", async (request, response) => {
    const { deviceKey } = request.params;
    const token = getDelegatedToken(request);

    const device = db
      .prepare(
        `SELECT intune_primary_user_upn, autopilot_assigned_user_upn, device_name, serial_number FROM device_state WHERE device_key = ?`
      )
      .get(deviceKey) as {
        intune_primary_user_upn: string | null;
        autopilot_assigned_user_upn: string | null;
        device_name: string | null;
        serial_number: string | null;
      } | undefined;

    if (!device) {
      response.status(404).json({ message: "Device not found." });
      return;
    }

    const upn = device.intune_primary_user_upn ?? device.autopilot_assigned_user_upn;

    if (!upn) {
      response.status(400).json({ message: "No user assigned to this device." });
      return;
    }

    try {
      const { status, data } = await requestWithDelegatedToken<GraphLicenseResponse>(
        token,
        `/users/${encodeURIComponent(upn)}/licenseDetails`
      );

      if (!data || status >= 400) {
        response.status(status === 404 ? 404 : 500).json({
          message:
            status === 404
              ? `User ${upn} not found in Entra ID.`
              : "Failed to retrieve license details from Graph API."
        });
        return;
      }

      const licenses = data.value.map((lic) => ({
        skuPartNumber: lic.skuPartNumber,
        servicePlans: lic.servicePlans.map((sp) => ({
          planName: sp.servicePlanName,
          status: sp.provisioningStatus
        }))
      }));

      const allPlans = data.value.flatMap((lic) => lic.servicePlans);

      const result: LicensingResult = {
        userUpn: upn,
        licenses,
        hasIntune: allPlans.some((sp) => sp.servicePlanName.toUpperCase().includes("INTUNE")),
        hasEntraP1: allPlans.some((sp) => sp.servicePlanName.toUpperCase().includes("AAD_PREMIUM")),
        hasEntraP2: allPlans.some((sp) => sp.servicePlanName.toUpperCase().includes("AAD_PREMIUM_P2"))
      };

      response.json(result);
    } catch (error) {
      response.status(500).json({
        message: error instanceof Error ? error.message : "Failed to retrieve license details."
      });
    }
  });

  return router;
}
