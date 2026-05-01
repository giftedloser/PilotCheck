import { AlertTriangle, ExternalLink } from "lucide-react";

export function WarningWithGuidance({
  title,
  guidance,
  link
}: {
  title: string;
  guidance: string;
  link?: { label: string; url: string };
}) {
  return (
    <div className="rounded-lg border border-[var(--pc-warning)]/35 bg-[var(--pc-warning-muted)] px-3.5 py-3 text-[12px] leading-relaxed text-[var(--pc-warning)]">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold">{title}</div>
          <div className="mt-1">
            <span className="font-semibold">What now: </span>
            {guidance}
          </div>
          {link ? (
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold underline-offset-2 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {link.label}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
