export const COMMAND_PALETTE_OPEN_EVENT = "runway:command-palette-open";

export function requestCommandPaletteOpen() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT));
}
