import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, HardDrive, Lock } from "lucide-react";

import type { DeviceDetailResponse } from "../../lib/types.js";
import { useAuthStatus } from "../../hooks/useAuth.js";
import { useBitlocker, type BitLockerKey } from "../../hooks/useBitlocker.js";
import { Button } from "../ui/button.js";
import { Card } from "../ui/card.js";

const AUTO_HIDE_MS = 60_000;

export function BitLockerWidget({ device }: { device: DeviceDetailResponse }) {
  const auth = useAuthStatus();
  const bitlocker = useBitlocker();

  const [keys, setKeys] = useState<BitLockerKey[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => {
      setRevealed(false);
      setKeys([]);
    }, AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  const isAuthed = auth.data?.authenticated === true;

  const handleRetrieve = async () => {
    setError(null);
    setCopyState("idle");
    try {
      const result = await bitlocker.mutateAsync(device.summary.deviceKey);
      if (result.success && result.keys.length > 0) {
        setKeys(result.keys);
        setRevealed(true);
      } else {
        setError(result.message ?? "No BitLocker recovery keys found.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retrieve BitLocker keys.");
    }
  };

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setError("Clipboard access denied.");
    }
  };

  const handleHide = () => {
    setRevealed(false);
    setKeys([]);
  };

  if (!isAuthed) {
    return (
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-[var(--pc-accent)]" />
          <span className="text-[13px] font-semibold text-white">BitLocker Recovery Keys</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-4 py-3">
          <Lock className="h-4 w-4 text-[var(--pc-text-muted)]" />
          <div className="text-[12px] text-[var(--pc-text-muted)]">
            Sign in as admin to retrieve BitLocker recovery keys for this device.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-[var(--pc-accent)]" />
          <span className="text-[13px] font-semibold text-white">BitLocker Recovery Keys</span>
        </div>
        {keys.length > 0 && revealed ? (
          <div className="text-[11px] text-[var(--pc-text-muted)]">
            Auto-hides in {Math.round(AUTO_HIDE_MS / 1000)}s
          </div>
        ) : null}
      </div>

      {keys.length === 0 ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-4 py-3">
          <div className="text-[12px] text-[var(--pc-text-secondary)]">
            Retrieve BitLocker recovery keys for this device. Every retrieval is logged for audit.
          </div>
          <Button onClick={handleRetrieve} disabled={bitlocker.isPending} className="shrink-0">
            {bitlocker.isPending ? "Retrieving..." : "Reveal Keys"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div
              key={k.id}
              className="rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-3 py-2.5"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--pc-text-muted)]">
                  {k.volumeType ?? "Unknown Volume"}
                </span>
                {k.createdDateTime && (
                  <span className="text-[10px] text-[var(--pc-text-muted)]">
                    {new Date(k.createdDateTime).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 font-mono text-[13px] text-[var(--pc-accent-hover)] break-all">
                  {revealed ? k.key : "•".repeat(48)}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRevealed((v) => !v)}
                    className="rounded p-1.5 text-[var(--pc-text-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--pc-text)]"
                    title={revealed ? "Hide" : "Show"}
                  >
                    {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(k.key)}
                    className="rounded p-1.5 text-[var(--pc-text-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--pc-text)]"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <div className="text-[11px] text-[var(--pc-text-muted)]">
              {copyState === "copied" ? (
                <span className="text-[var(--pc-healthy)]">Copied to clipboard</span>
              ) : (
                <>{keys.length} recovery key{keys.length > 1 ? "s" : ""} found</>
              )}
            </div>
            <Button variant="secondary" onClick={handleHide}>
              Hide
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
