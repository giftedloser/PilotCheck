import { Router } from "express";
import type Database from "better-sqlite3";

import { requireDelegatedAuth, getDelegatedToken, getDelegatedUser } from "../auth/auth-middleware.js";
import { logAction } from "../db/queries/actions.js";
import { requestWithDelegatedToken } from "../auth/delegated-auth.js";

interface ImportEntry {
  serialNumber: string;
  hardwareHash: string;
  groupTag?: string;
}

interface ImportResult {
  serialNumber: string;
  success: boolean;
  status: number;
  message: string;
}

export function autopilotImportRouter(db: Database.Database) {
  const router = Router();

  // All routes require delegated auth
  router.use(requireDelegatedAuth);

  // POST / — import hardware hashes to Windows Autopilot
  router.post("/", async (request, response) => {
    const entries = request.body?.entries;

    if (!Array.isArray(entries) || entries.length === 0) {
      response.status(400).json({ message: "entries must be a non-empty array." });
      return;
    }
    if (entries.length > 50) {
      response.status(400).json({ message: "Maximum 50 entries per request." });
      return;
    }

    // Validate each entry
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry || typeof entry.serialNumber !== "string" || !entry.serialNumber.trim()) {
        response.status(400).json({ message: `Entry ${i + 1}: serialNumber is required.` });
        return;
      }
      if (!entry || typeof entry.hardwareHash !== "string" || !entry.hardwareHash.trim()) {
        response.status(400).json({ message: `Entry ${i + 1}: hardwareHash is required.` });
        return;
      }
    }

    const token = getDelegatedToken(request);
    const user = getDelegatedUser(request);
    const triggeredAt = new Date().toISOString();

    const results: ImportResult[] = [];

    // Process entries sequentially to respect Graph rate limits
    for (const entry of entries as ImportEntry[]) {
      const graphBody: Record<string, string> = {
        serialNumber: entry.serialNumber.trim(),
        hardwareIdentifier: entry.hardwareHash.trim()
      };
      if (entry.groupTag?.trim()) {
        graphBody.groupTag = entry.groupTag.trim();
      }

      let result: ImportResult;
      try {
        const graphResponse = await requestWithDelegatedToken(
          token,
          "/deviceManagement/importedWindowsAutopilotDeviceIdentities",
          { method: "POST", body: graphBody }
        );

        if (graphResponse.status >= 200 && graphResponse.status < 300) {
          result = {
            serialNumber: entry.serialNumber,
            success: true,
            status: graphResponse.status,
            message: "Device imported successfully."
          };
        } else {
          result = {
            serialNumber: entry.serialNumber,
            success: false,
            status: graphResponse.status,
            message: `Graph API returned ${graphResponse.status}.`
          };
        }
      } catch (error) {
        result = {
          serialNumber: entry.serialNumber,
          success: false,
          status: 500,
          message: error instanceof Error ? error.message : "Import failed."
        };
      }

      // Audit log each import attempt
      logAction(db, {
        deviceSerial: entry.serialNumber,
        deviceName: null,
        intuneId: null,
        actionType: "autopilot-import",
        triggeredBy: user,
        triggeredAt,
        graphResponseStatus: result.status,
        notes: `${result.message}${entry.groupTag ? ` (tag: ${entry.groupTag})` : ""}`
      });

      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    response.json({
      total: results.length,
      successCount,
      failureCount: results.length - successCount,
      results
    });
  });

  // POST /parse-csv — parse Autopilot hardware hash CSV into structured entries
  router.post("/parse-csv", (request, response) => {
    const csvText = request.body?.csvText;

    if (typeof csvText !== "string" || !csvText.trim()) {
      response.status(400).json({ message: "csvText is required." });
      return;
    }

    const entries: ImportEntry[] = [];
    const errors: string[] = [];

    const lines = csvText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      response.status(400).json({ message: "CSV is empty." });
      return;
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase());

    const serialIndex = headers.findIndex(
      (h) => h === "device serial number" || h === "serialnumber" || h === "serial number"
    );
    const hashIndex = headers.findIndex(
      (h) => h === "hardware hash" || h === "hardwarehash" || h === "hardware identifier"
    );
    const tagIndex = headers.findIndex(
      (h) => h === "group tag" || h === "grouptag"
    );

    if (serialIndex === -1) {
      errors.push("Missing required column: 'Device Serial Number'. Check that the CSV header row is present.");
      response.json({ entries, errors });
      return;
    }
    if (hashIndex === -1) {
      errors.push("Missing required column: 'Hardware Hash'. Check that the CSV header row is present.");
      response.json({ entries, errors });
      return;
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const serialNumber = fields[serialIndex]?.trim() ?? "";
      const hardwareHash = fields[hashIndex]?.trim() ?? "";
      const groupTag = tagIndex >= 0 ? (fields[tagIndex]?.trim() ?? "") : "";

      if (!serialNumber) {
        errors.push(`Row ${i + 1}: Missing serial number.`);
        continue;
      }
      if (!hardwareHash) {
        errors.push(`Row ${i + 1}: Missing hardware hash.`);
        continue;
      }

      const entry: ImportEntry = { serialNumber, hardwareHash };
      if (groupTag) {
        entry.groupTag = groupTag;
      }
      entries.push(entry);
    }

    response.json({ entries, errors });
  });

  return router;
}

/**
 * Minimal CSV line parser that handles quoted fields (hardware hashes can be
 * very long base64 strings that sometimes get quoted by export tools).
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}
