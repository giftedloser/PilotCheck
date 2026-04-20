import { Link, useRouterState, useSearch } from "@tanstack/react-router";
import {
  Activity,
  Building2,
  DatabaseZap,
  GitBranch,
  History,
  LayoutDashboard,
  Monitor,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  TabletSmartphone,
  UsersRound
} from "lucide-react";

import { useSettings } from "../../hooks/useSettings.js";
import { useTheme, type Theme } from "../../hooks/useTheme.js";
import { cn } from "../../lib/utils.js";
import { AuthIndicator } from "./AuthIndicator.js";

declare const __APP_VERSION__: string;

// When rendered in a Vitest jsdom env the `define` replacement may not fire
// (the top-level define doesn't cascade into `projects`), so fall back to a
// global or a dev placeholder rather than crashing the component tree.
const appVersion =
  typeof __APP_VERSION__ !== "undefined"
    ? __APP_VERSION__
    : (globalThis as { __APP_VERSION__?: string }).__APP_VERSION__ ?? "dev";

const themeIcons: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const themeLabels: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Triage",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard },
      { to: "/devices", label: "Devices", icon: TabletSmartphone }
    ]
  },
  {
    label: "Inspect",
    items: [
      { to: "/profiles", label: "Profiles", icon: ShieldCheck },
      { to: "/groups", label: "Groups", icon: UsersRound },
      { to: "/provisioning", label: "Provisioning", icon: GitBranch }
    ]
  },
  {
    label: "System",
    items: [
      { to: "/sync", label: "Sync", icon: DatabaseZap },
      { to: "/actions", label: "Action Audit", icon: History },
      { to: "/settings", label: "Settings", icon: Settings2 }
    ]
  }
];

export function Sidebar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const settings = useSettings();
  const [theme, cycleTheme] = useTheme();

  // Properties pulled from tag_config so each casino's leader can jump
  // straight to "their" devices. Deduped because the same property label
  // may map to multiple group tags.
  const properties = (() => {
    if (!settings.data) return [] as string[];
    const seen = new Set<string>();
    for (const tag of settings.data.tagConfig) {
      if (tag.propertyLabel && !seen.has(tag.propertyLabel)) {
        seen.add(tag.propertyLabel);
      }
    }
    return Array.from(seen).sort();
  })();

  return (
    <aside className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col border-r border-[var(--pc-border)] bg-[var(--pc-surface)]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--pc-accent)] text-[var(--pc-text)]">
          <Activity className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-tight text-[var(--pc-text)]">PilotCheck</div>
          <div className="text-[11px] text-[var(--pc-text-muted)]">Windows Autopilot · Intune · Entra</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="mt-1 flex flex-1 flex-col gap-3 overflow-y-auto px-3 pb-3">
        {navGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--pc-text-muted)]">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
                    active
                      ? "bg-[var(--pc-accent-muted)] text-[var(--pc-accent-hover)]"
                      : "text-[var(--pc-text-secondary)] hover:bg-[var(--pc-tint-hover)] hover:text-[var(--pc-text)] hover:translate-x-0.5"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {properties.length > 0 && (
          <PropertiesGroup properties={properties} pathname={pathname} />
        )}
      </nav>

      {/* Footer */}
      <div className="space-y-3 border-t border-[var(--pc-border)] px-3 py-4">
        <AuthIndicator />
        <div className="flex items-center justify-between px-2 text-[10.5px]">
          <span className="text-[var(--pc-text-muted)]">Engine</span>
          <span className="font-mono text-[var(--pc-text-secondary)]">v{appVersion}</span>
        </div>
        <div className="flex items-center justify-between gap-2 px-2 text-[10.5px] text-[var(--pc-text-muted)]">
          <span>Theme</span>
          {(() => {
            const ThemeIcon = themeIcons[theme];
            return (
              <button
                type="button"
                onClick={cycleTheme}
                className="flex items-center gap-1.5 rounded-md border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-2 py-1 text-[10.5px] text-[var(--pc-text-secondary)] transition-colors hover:border-[var(--pc-border-hover)] hover:text-[var(--pc-text)]"
                title={`Current: ${themeLabels[theme]}. Click to cycle.`}
              >
                <ThemeIcon className="h-3 w-3" />
                {themeLabels[theme]}
              </button>
            );
          })()}
        </div>
        <div className="flex items-center justify-between gap-2 px-2 text-[10.5px] text-[var(--pc-text-muted)]">
          <span>Shortcuts</span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--pc-text-secondary)]">
              ?
            </kbd>
            <span className="text-[var(--pc-text-muted)]">·</span>
            <kbd className="rounded border border-[var(--pc-border)] bg-[var(--pc-surface-raised)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--pc-text-secondary)]">
              ⌘K
            </kbd>
          </span>
        </div>
      </div>
    </aside>
  );
}

/**
 * Properties group is rendered as its own component so we can call
 * `useSearch` (which only resolves on the matching route) without
 * unconditionally subscribing the rest of the sidebar to /devices state.
 */
function PropertiesGroup({
  properties,
  pathname
}: {
  properties: string[];
  pathname: string;
}) {
  // useSearch with `strict: false` returns whatever search the closest
  // matched route has — so we get the active property only when we're on
  // /devices, otherwise an empty object.
  const search = useSearch({ strict: false }) as { property?: string };
  const activeProperty = pathname.startsWith("/devices") ? search.property : undefined;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--pc-text-muted)]">
        Properties
      </div>
      {properties.map((property) => {
        const active = activeProperty === property;
        return (
          <Link
            key={property}
            to="/devices"
            search={{
              search: undefined,
              health: undefined,
              flag: undefined,
              property,
              profile: undefined,
              page: 1,
              pageSize: 25
            }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150",
              active
                ? "bg-[var(--pc-accent-muted)] text-[var(--pc-accent-hover)]"
                : "text-[var(--pc-text-secondary)] hover:bg-[var(--pc-tint-hover)] hover:text-[var(--pc-text)] hover:translate-x-0.5"
            )}
            title={`Filter device queue to ${property}`}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate">{property}</span>
          </Link>
        );
      })}
    </div>
  );
}
