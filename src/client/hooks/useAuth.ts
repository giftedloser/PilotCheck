import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "../components/shared/toast.js";
import type { AuthStatus } from "../lib/types.js";
import { apiRequest } from "../lib/api.js";
import { useSettings } from "./useSettings.js";

const AUTH_WINDOW_POLL_INTERVAL_MS = 1_000;
const AUTH_WINDOW_TIMEOUT_MS = 120_000;
const AUTH_CALLBACK_GRACE_MS = 5_000;
const AUTH_COMPLETE_MESSAGE = "pilotcheck-auth-complete";
const AUTH_POPUP_FEATURES = "popup=yes,width=640,height=760";

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function primeAuthPopup() {
  const popup = window.open("", "runway-admin-signin", AUTH_POPUP_FEATURES);
  if (!popup) return null;

  try {
    popup.document.title = "Runway Microsoft Sign-In";
    popup.document.body.style.margin = "0";
    popup.document.body.innerHTML = `
      <main style="
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0f1720;
        color: #e5eef8;
        font: 14px/1.5 Segoe UI, sans-serif;
      ">
        <section style="
          width: min(420px, calc(100vw - 32px));
          padding: 24px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 16px;
          background: rgba(15, 23, 32, 0.96);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
        ">
          <h1 style="margin: 0 0 8px; font-size: 18px;">Preparing Microsoft sign-in</h1>
          <p style="margin: 0; color: #b6c3d1;">Runway is opening the delegated admin session.</p>
        </section>
      </main>
    `;
  } catch {
    // Some shells restrict writing to the popup. The opened window is still usable.
  }

  popup.focus();
  return popup;
}

async function waitForDesktopAuth(popup: Window) {
  const deadline = Date.now() + AUTH_WINDOW_TIMEOUT_MS;
  let completedByCallback = false;
  let callbackDeadline: number | null = null;

  const onMessage = (event: MessageEvent) => {
    if (event.source !== popup) return;
    const payload = event.data as { type?: string } | null;
    if (payload?.type === AUTH_COMPLETE_MESSAGE) {
      completedByCallback = true;
      callbackDeadline = Date.now() + AUTH_CALLBACK_GRACE_MS;
    }
  };

  window.addEventListener("message", onMessage);

  try {
    while (Date.now() < Math.min(deadline, callbackDeadline ?? deadline)) {
      const status = await apiRequest<AuthStatus>("/api/auth/status").catch(() => null);
      if (status?.authenticated) {
        return status;
      }

      if (popup.closed && !completedByCallback) {
        break;
      }

      await delay(completedByCallback ? 150 : AUTH_WINDOW_POLL_INTERVAL_MS);
    }

    return (await apiRequest<AuthStatus>("/api/auth/status").catch(() => null)) ?? null;
  } finally {
    window.removeEventListener("message", onMessage);
  }
}

export function useAuthStatus() {
  return useQuery({
    queryKey: ["auth", "status"],
    queryFn: () => apiRequest<AuthStatus>("/api/auth/status"),
    refetchInterval: 60_000,
    staleTime: 30_000
  });
}

export function useLogin() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const settings = useSettings();
  const canStart = settings.data?.graph.configured === true;
  const blockedReason = settings.isLoading
    ? "Runway is still loading its Graph configuration."
    : canStart
      ? null
      : `Microsoft Graph sign-in is unavailable in mock mode. Missing: ${(settings.data?.graph.missing ?? []).join(", ")}.`;

  const mutation = useMutation({
    mutationFn: async () => {
      if (blockedReason) {
        throw new Error(blockedReason);
      }

      // Open synchronously from the button click before the async API request.
      // Otherwise browsers can classify the eventual sign-in window as a
      // non-user-initiated popup and silently block it.
      const popup = primeAuthPopup();
      if (!popup) {
        throw new Error("Runway could not open the Microsoft sign-in window. Allow popups for this app and try again.");
      }

      try {
        const { loginUrl } = await apiRequest<{ loginUrl: string }>("/api/auth/login");
        popup.location.href = loginUrl;
      } catch (error) {
        popup.close();
        throw error;
      }

      popup.focus();
      return popup;
    },
    onSuccess: (popup) => {
      toast.push({
        variant: "info",
        title: "Continue in Microsoft sign-in",
        description: "Finish the delegated admin sign-in in the opened window."
      });

      void (async () => {
        const status = await waitForDesktopAuth(popup);
        if (status?.authenticated) {
          await queryClient.invalidateQueries({ queryKey: ["auth", "status"] });
          toast.push({
            variant: "success",
            title: "Admin sign-in complete",
            description: status.user ?? "Delegated admin session is active."
          });
          return;
        }

        if (!popup.closed) {
          toast.push({
            variant: "warning",
            title: "Sign-in still pending",
            description: "Runway did not receive a completed admin session yet."
          });
        }
      })();
    },
    onError: (error) => {
      toast.push({
        variant: "error",
        title: "Admin sign-in unavailable",
        description: error instanceof Error ? error.message : "Could not start Microsoft sign-in."
      });
    }
  });

  return {
    ...mutation,
    canStart,
    blockedReason
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiRequest<{ authenticated: boolean }>("/api/auth/logout", {
        method: "POST"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "status"] });
    }
  });
}
