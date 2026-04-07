import { Outlet } from "@tanstack/react-router";

import { Sidebar } from "./Sidebar.js";

export function AppShell() {
  // Note: the window is the scroll container (not an inner <main>) so that
  // TanStack Router's built-in scroll restoration works on back/forward nav.
  return (
    <div className="flex min-h-screen bg-[var(--pc-bg)]">
      <Sidebar />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-6 lg:px-10 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
