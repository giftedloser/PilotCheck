import { ChevronDown, Code2, Copy } from "lucide-react";
import { useState } from "react";

import type { DeviceDetailResponse } from "../../lib/types.js";
import { cn } from "../../lib/utils.js";
import { useToast } from "../shared/toast.js";
import { Card } from "../ui/card.js";
import { SourceBadge, type DataSource } from "../shared/SourceBadge.js";

interface SourceJsonPanelProps {
  device: DeviceDetailResponse;
}

interface JsonBlockProps {
  label: string;
  source: DataSource;
  json: string | null;
}

function JsonBlock({ label, source, json }: JsonBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const toast = useToast();

  if (!json) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--pc-border)] bg-[var(--pc-surface-raised)] p-3">
        <div className="flex items-center gap-2">
          <SourceBadge source={source} size="xs" />
          <span className="text-[12px] text-[var(--pc-text-muted)]">{label}</span>
          <span className="text-[11px] italic text-[var(--pc-text-muted)]">— No data</span>
        </div>
      </div>
    );
  }

  let formatted: string;
  try {
    formatted = JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    formatted = json;
  }

  const lines = formatted.split("\n").length;
  const preview = formatted.split("\n").slice(0, 4).join("\n");

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      toast.push({
        variant: "success",
        title: "Copied",
        description: `${label} JSON copied to clipboard.`,
        durationMs: 1800
      });
    } catch {
      toast.push({
        variant: "error",
        title: "Could not copy",
        description: "Clipboard access denied."
      });
    }
  };

  return (
    <div className="rounded-lg border border-[var(--pc-border)] bg-[var(--pc-surface-raised)]">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--pc-tint-subtle)]"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[var(--pc-text-muted)] transition-transform",
            expanded && "rotate-180"
          )}
        />
        <SourceBadge source={source} size="xs" />
        <span className="flex-1 text-[12px] font-medium text-[var(--pc-text-secondary)]">
          {label}
        </span>
        <span className="text-[10.5px] tabular-nums text-[var(--pc-text-muted)]">
          {lines} lines
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void onCopy();
          }}
          className="rounded p-1 text-[var(--pc-text-muted)] transition-colors hover:bg-[var(--pc-tint-hover)] hover:text-[var(--pc-text)]"
          title={`Copy ${label} JSON`}
        >
          <Copy className="h-3 w-3" />
        </button>
      </button>

      {expanded ? (
        <div className="border-t border-[var(--pc-border)] p-3.5">
          <pre className="max-h-80 overflow-auto whitespace-pre font-mono text-[11px] leading-relaxed text-[var(--pc-text-secondary)]">
            {formatted}
          </pre>
        </div>
      ) : (
        <div className="border-t border-[var(--pc-border)] px-3.5 py-2">
          <pre className="overflow-hidden whitespace-pre font-mono text-[10.5px] leading-relaxed text-[var(--pc-text-muted)]">
            {preview}
            {lines > 4 && (
              <span className="text-[var(--pc-accent)] opacity-60">
                {"\n"}… {lines - 4} more lines
              </span>
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

export function SourceJsonPanel({ device }: SourceJsonPanelProps) {
  const refs = device.sourceRefs;
  const hasAny = refs.autopilotRawJson || refs.intuneRawJson || refs.entraRawJson;

  if (!hasAny) return null;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Code2 className="h-4 w-4 text-[var(--pc-accent)]" />
        <span className="text-[13px] font-semibold text-[var(--pc-text)]">Source Data</span>
        <span className="text-[11.5px] text-[var(--pc-text-muted)]">
          · Raw JSON from Microsoft Graph
        </span>
      </div>
      <div className="space-y-2">
        <JsonBlock label="Autopilot" source="autopilot" json={refs.autopilotRawJson} />
        <JsonBlock label="Intune" source="intune" json={refs.intuneRawJson} />
        <JsonBlock label="Entra ID" source="entra" json={refs.entraRawJson} />
      </div>
    </Card>
  );
}
