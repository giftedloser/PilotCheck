import { useNavigate, useSearch } from "@tanstack/react-router";
import { Rows2, Rows3 } from "lucide-react";

import { DeviceFilters } from "../components/devices/DeviceFilters.js";
import { DeviceTable, type DeviceTableDensity } from "../components/devices/DeviceTable.js";
import { PageHeader } from "../components/layout/PageHeader.js";
import { ErrorState, LoadingState } from "../components/shared/ErrorState.js";
import { Pagination } from "../components/shared/Pagination.js";
import { useDevices } from "../hooks/useDevices.js";
import { usePreference } from "../hooks/usePreference.js";
import { cn } from "../lib/utils.js";

export function DeviceListPage() {
  const search = useSearch({ from: "/devices" });
  const navigate = useNavigate({ from: "/devices" });
  const devices = useDevices(search);
  const [density, setDensity] = usePreference<DeviceTableDensity>(
    "device-density",
    "comfortable"
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Triage"
        title="Device Queue"
        description="Investigate join, enrollment, and assignment problems across the estate. Filter by health, flag, or property to narrow your triage list."
      />
      <DeviceFilters />

      <div className="flex items-center justify-between text-[11px] text-[var(--pc-text-muted)]">
        <div>
          {devices.data
            ? `${devices.data.total.toLocaleString()} device${devices.data.total === 1 ? "" : "s"}`
            : ""}
        </div>
        <div
          className="inline-flex items-center gap-0.5 rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] p-0.5"
          role="group"
          aria-label="Row density"
        >
          <DensityButton
            active={density === "comfortable"}
            onClick={() => setDensity("comfortable")}
            label="Comfortable"
          >
            <Rows2 className="h-3 w-3" />
          </DensityButton>
          <DensityButton
            active={density === "compact"}
            onClick={() => setDensity("compact")}
            label="Compact"
          >
            <Rows3 className="h-3 w-3" />
          </DensityButton>
        </div>
      </div>

      {devices.isLoading ? (
        <LoadingState label="Loading devices…" />
      ) : devices.isError ? (
        <ErrorState
          title="Could not load devices"
          error={devices.error}
          onRetry={() => devices.refetch()}
        />
      ) : devices.data ? (
        <>
          <DeviceTable devices={devices.data.items} density={density} />
          <Pagination
            page={devices.data.page}
            pageSize={devices.data.pageSize}
            total={devices.data.total}
            onPageChange={(page) =>
              navigate({ search: (previous) => ({ ...previous, page }) })
            }
            onPageSizeChange={(pageSize) =>
              navigate({ search: (previous) => ({ ...previous, page: 1, pageSize }) })
            }
          />
        </>
      ) : null}
    </div>
  );
}

function DensityButton({
  active,
  onClick,
  label,
  children
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex h-6 w-7 items-center justify-center rounded transition-colors",
        active
          ? "bg-[var(--pc-accent-muted)] text-[var(--pc-accent)]"
          : "text-[var(--pc-text-muted)] hover:bg-white/[0.04] hover:text-[var(--pc-text)]"
      )}
    >
      {children}
    </button>
  );
}
