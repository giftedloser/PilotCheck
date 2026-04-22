import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Lock, Shield, XCircle } from "lucide-react";

import type { DeviceDetailResponse } from "../../lib/types.js";
import { useAuthStatus } from "../../hooks/useAuth.js";
import { apiRequest } from "../../lib/api.js";
import { Button } from "../ui/button.js";
import { Card } from "../ui/card.js";

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

function LicenseCheck({ label, present }: { label: string; present: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {present ? (
        <CheckCircle2 className="h-4 w-4 text-[var(--pc-healthy)]" />
      ) : (
        <XCircle className="h-4 w-4 text-[var(--pc-critical)]" />
      )}
      <span className="text-[12.5px] text-[var(--pc-text)]">{label}</span>
    </div>
  );
}

export function LicensingWidget({ device }: { device: DeviceDetailResponse }) {
  const auth = useAuthStatus();
  const activeDeviceKey = useRef(device.summary.deviceKey);

  const [result, setResult] = useState<LicensingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthed = auth.data?.authenticated === true;

  useEffect(() => {
    activeDeviceKey.current = device.summary.deviceKey;
    setResult(null);
    setError(null);
    setLoading(false);
  }, [device.summary.deviceKey]);

  const handleCheck = async () => {
    const requestDeviceKey = device.summary.deviceKey;
    setError(null);
    setLoading(true);
    try {
      const data = await apiRequest<LicensingResult>(
        `/api/licensing/${requestDeviceKey}`
      );
      if (activeDeviceKey.current === requestDeviceKey) {
        setResult(data);
      }
    } catch (err) {
      if (activeDeviceKey.current === requestDeviceKey) {
        setError(
          err instanceof Error ? err.message : "Could not retrieve license information."
        );
      }
    } finally {
      if (activeDeviceKey.current === requestDeviceKey) {
        setLoading(false);
      }
    }
  };

  if (!isAuthed) {
    return (
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--pc-accent)]" />
          <span className="text-[13px] font-semibold text-[var(--pc-text)]">
            User Licensing
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-4 py-3">
          <Lock className="h-4 w-4 text-[var(--pc-text-muted)]" />
          <div className="text-[12px] text-[var(--pc-text-muted)]">
            Sign in as admin to check user licensing for this device.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4 text-[var(--pc-accent)]" />
        <span className="text-[13px] font-semibold text-[var(--pc-text)]">
          User Licensing
        </span>
      </div>

      {!result ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-4 py-3">
          <div className="text-[12px] text-[var(--pc-text-secondary)]">
            Check whether the assigned user has the required Intune and Entra ID licenses.
          </div>
          <Button onClick={handleCheck} disabled={loading} className="shrink-0">
            {loading ? "Checking…" : "Check Licenses"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--pc-text-muted)]">
              Assigned User
            </div>
            <div className="mt-1 font-mono text-[12.5px] text-[var(--pc-text)]">
              {result.userUpn}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-4 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--pc-text-muted)] mb-2">
              Required Licenses
            </div>
            <div className="space-y-1.5">
              <LicenseCheck label="Microsoft Intune" present={result.hasIntune} />
              <LicenseCheck label="Entra ID P1" present={result.hasEntraP1} />
              <LicenseCheck label="Entra ID P2" present={result.hasEntraP2} />
            </div>
          </div>

          {result.licenses.length > 0 && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--pc-text-muted)] mb-1.5">
                All Assigned SKUs
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.licenses.map((lic) => (
                  <span
                    key={lic.skuPartNumber}
                    className="rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface)] px-2 py-0.5 text-[11px] text-[var(--pc-text-secondary)]"
                  >
                    {lic.skuPartNumber}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleCheck} disabled={loading}>
              {loading ? "Checking…" : "Recheck"}
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <div className="mt-3 rounded-lg border border-[var(--pc-critical)]/30 bg-[var(--pc-critical-muted)] px-3 py-2 text-[12px] text-[var(--pc-critical)]">
          {error}
        </div>
      ) : null}
    </Card>
  );
}
