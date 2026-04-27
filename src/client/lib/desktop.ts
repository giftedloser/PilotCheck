interface TauriWindow {
  __TAURI_INTERNALS__?: unknown;
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in (window as TauriWindow);
}

export async function openExternalUrl(url: string) {
  if (!isTauriRuntime()) return false;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_external_url", { url });
    return true;
  } catch {
    return false;
  }
}
