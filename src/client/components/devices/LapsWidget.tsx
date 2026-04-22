import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, Lock, RefreshCcw } from "lucide-react";

import type { DeviceDetailResponse, LapsCredential } from "../../lib/types.js";
import { useAuthStatus } from "../../hooks/useAuth.js";
import { useLaps } from "../../hooks/useLaps.js";
import { Button } from "../ui/button.js";
import { Card } from "../ui/card.js";

const AUTO_HIDE_MS = 30_000;

export function LapsWidget({ device }: { device: DeviceDetailResponse }) {
  const auth = useAuthStatus();
  const laps = useLaps();

  const [credential, setCredential] = useState<LapsCredential | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [error, setError] = useState<string | null>(null);

  // Auto-hide the password after a timeout
  useEffect(() => {
    if (!revealed) return;
    const timer = window.setTimeout(() => {
      setRevealed(false);
      setCredential(null);
    }, AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  const isAuthed = auth.data?.authenticated === true;

  const handleRetrieve = async () => {
    setError(null);
    setCopyState("idle");
    try {
      const result = await laps.mutateAsync(device.summary.deviceKey);
      if (result.success && result.credential) {
        setCredential(result.credential);
        setRevealed(true);
      } else {
        setError(result.message ?? "Could not retrieve LAPS password.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not retrieve LAPS password.");
    }
  };

  const handleCopy = async () => {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential.password);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setError("Clipboard access denied.");
    }
  };

  const handleHide = () => {
    setRevealed(false);
    setCredential(null);
  };

  if (!isAuthed) {
    return (
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[var(--pc-accent)]" />
          <span className="text-[13px] font-semibold text-[var(--pc-text)]">Local Admin Password</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-4 py-3">
          <Lock className="h-4 w-4 text-[var(--pc-text-muted)]" />
          <div className="text-[12px] text-[var(--pc-text-muted)]">
            Sign in as admin to retrieve the LAPS password for this device.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[var(--pc-accent)]" />
          <span className="text-[13px] font-semibold text-[var(--pc-text)]">Local Admin Password (LAPS)</span>
        </div>
        {credential && revealed ? (
          <div className="text-[11px] text-[var(--pc-text-muted)]">
            Auto-hides in {Math.round(AUTO_HIDE_MS / 1000)}s
          </div>
        ) : null}
      </div>

      {!credential ? (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-4 py-3">
          <div className="text-[12px] text-[var(--pc-text-secondary)]">
            Retrieve the current LAPS-managed local administrator password. Every retrieval is logged
            for audit.
          </div>
          <Button onClick={handleRetrieve} disabled={laps.isPending} className="shrink-0">
            {laps.isPending ? "Retrieving…" : "Reveal Password"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--pc-text-muted)]">
                Account
              </div>
              <div className="mt-1 font-mono text-[12.5px] text-[var(--pc-text)]">{credential.accountName}</div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--pc-text-muted)]">
                Backup Time
              </div>
              <div className="mt-1 text-[12.5px] text-[var(--pc-text-secondary)]">
                {credential.backupDateTime
                  ? new Date(credential.backupDateTime).toLocaleString()
                  : "Unknown"}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 font-mono text-[13px] text-[var(--pc-accent-hover)] break-all">
                {revealed ? credential.password : "•".repeat(Math.min(credential.password.length, 24))}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRevealed((value) => !value)}
                  className="rounded p-1.5 text-[var(--pc-text-muted)] transition-colors hover:bg-[var(--pc-tint-hover)] hover:text-[var(--pc-text)]"
                  title={revealed ? "Hide" : "Show"}
                >
                  {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded p-1.5 text-[var(--pc-text-muted)] transition-colors hover:bg-[var(--pc-tint-hover)] hover:text-[var(--pc-text)]"
                  title="Copy to clipboard"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[11px] text-[var(--pc-text-muted)]">
              {copyState === "copied" ? (
                <span className="text-[var(--pc-healthy)]">Copied to clipboard</span>
              ) : (
                <>
                  {credential.passwordExpirationDateTime
                    ? `Expires ${new Date(credential.passwordExpirationDateTime).toLocaleString()}`
                    : "No expiration set"}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleRetrieve} disabled={laps.isPending}>
                <RefreshCcw className="h-3 w-3" />
                Refetch
              </Button>
              <Button variant="secondary" onClick={handleHide}>
                Hide
              </Button>
            </div>
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
