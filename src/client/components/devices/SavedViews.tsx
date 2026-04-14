import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertOctagon, ListFilter, ShieldOff, UserX, Workflow } from "lucide-react";

import type { FlagCode, HealthLevel } from "../../lib/types.js";
import { cn } from "../../lib/utils.js";

interface SavedView {
  id: string;
  label: string;
  icon: typeof AlertOctagon;
  health?: Exclude<HealthLevel, "unknown">;
  flag?: FlagCode;
}

/**
 * One-click views over the device queue. Each view writes to the same
 * search params the manual filters use, so they round-trip cleanly with
 * the URL and the existing DeviceFilters component picks them up.
 */
const VIEWS: SavedView[] = [
  { id: "all", label: "All", icon: ListFilter },
  { id: "critical", label: "Critical", icon: AlertOctagon, health: "critical" },
  { id: "no-profile", label: "No profile", icon: ShieldOff, flag: "no_profile_assigned" },
  { id: "user-mismatch", label: "User mismatch", icon: UserX, flag: "user_mismatch" },
  { id: "stalled", label: "Provisioning stalled", icon: Workflow, flag: "provisioning_stalled" }
];

export function SavedViews() {
  const navigate = useNavigate({ from: "/devices" });
  const search = useSearch({ from: "/devices" });

  const matches = (view: SavedView) => {
    if (view.id === "all") {
      return !search.health && !search.flag && !search.search && !search.profile && !search.property;
    }
    if (view.health && search.health !== view.health) return false;
    if (view.flag && search.flag !== view.flag) return false;
    if (!view.health && search.health) return false;
    if (!view.flag && search.flag) return false;
    return true;
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--pc-text-muted)]">
        Views
      </span>
      {VIEWS.map((view) => {
        const Icon = view.icon;
        const active = matches(view);
        return (
          <button
            key={view.id}
            type="button"
            onClick={() =>
              navigate({
                search: () => ({
                  search: undefined,
                  health: view.health,
                  flag: view.flag,
                  property: undefined,
                  profile: undefined,
                  page: 1,
                  pageSize: search.pageSize ?? 25
                })
              })
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? "border-[var(--pc-accent)]/60 bg-[var(--pc-accent-muted)] text-[var(--pc-text)]"
                : "border-[var(--pc-border)] bg-[var(--pc-surface-raised)] text-[var(--pc-text-secondary)] hover:border-[var(--pc-accent)]/40 hover:text-[var(--pc-text)]"
            )}
          >
            <Icon className="h-3 w-3" />
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
