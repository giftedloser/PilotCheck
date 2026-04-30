import { useId, useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

import { cn } from "../../lib/utils.js";

export function AdvancedDisclosure({
  title = "Advanced",
  description,
  children,
  defaultOpen = false,
  className,
  contentClassName
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  const toggle = () => setOpen((value) => !value);

  return (
    <div
      className={cn(
        "rounded-[var(--pc-radius)] border border-[var(--pc-border)] bg-[var(--pc-surface)]",
        className
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle();
          }
        }}
        className="flex w-full items-start gap-2 rounded-[var(--pc-radius)] px-4 py-3 text-left text-[12px] font-semibold text-[var(--pc-text-secondary)] transition-colors hover:bg-[var(--pc-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pc-accent)]"
      >
        <SlidersHorizontal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--pc-accent)]" />
        <span className="min-w-0 flex-1">
          <span className="block">{title}</span>
          {description ? (
            <span className="mt-1 block text-[11.5px] font-normal leading-relaxed text-[var(--pc-text-muted)]">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--pc-text-muted)] transition-transform",
            open ? "rotate-180" : ""
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={contentId}
        hidden={!open}
        className={cn("border-t border-[var(--pc-border)] p-4", contentClassName)}
      >
        {children}
      </div>
    </div>
  );
}
