import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "../ui/button.js";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  requireTyped?: string;
  typedValue?: string;
  onTypedChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  requireTyped,
  typedValue = "",
  onTypedChange,
  onConfirm,
  onCancel,
  isLoading
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmDisabled =
    isLoading || (Boolean(requireTyped) && typedValue.trim() !== requireTyped);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--pc-border)] bg-[var(--pc-surface)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[var(--pc-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            {destructive ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--pc-critical-muted)] text-[var(--pc-critical)]">
                <AlertTriangle className="h-4 w-4" />
              </div>
            ) : null}
            <div>
              <div className="text-[14px] font-semibold text-white">{title}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-[var(--pc-text-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--pc-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-[12.5px] leading-relaxed text-[var(--pc-text-secondary)]">
            {description}
          </p>
          {requireTyped ? (
            <div className="mt-4 space-y-1.5">
              <label className="block text-[11px] font-medium uppercase tracking-wide text-[var(--pc-text-muted)]">
                Type <span className="font-mono text-[var(--pc-critical)]">{requireTyped}</span> to confirm
              </label>
              <input
                type="text"
                value={typedValue}
                onChange={(event) => onTypedChange?.(event.target.value)}
                className="w-full rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-3 py-2 font-mono text-[12.5px] text-white outline-none transition-colors focus:border-[var(--pc-accent)]"
                autoFocus
              />
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[var(--pc-border)] px-5 py-3">
          <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {isLoading ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
