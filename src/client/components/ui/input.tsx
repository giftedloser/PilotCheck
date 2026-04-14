import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils.js";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-3 text-[13px] text-[var(--pc-text)] outline-none placeholder:text-[var(--pc-text-muted)] hover:border-[var(--pc-border-hover)] focus:border-[var(--pc-accent)] focus:ring-1 focus:ring-[var(--pc-accent)]/30 transition-all duration-150",
        className
      )}
      {...props}
    />
  );
}
