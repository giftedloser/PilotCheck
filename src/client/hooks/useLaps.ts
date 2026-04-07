import { useMutation } from "@tanstack/react-query";

import type { LapsCredential } from "../lib/types.js";
import { apiRequest } from "../lib/api.js";

export interface LapsResult {
  success: boolean;
  credential: LapsCredential | null;
  message?: string;
}

export function useLaps() {
  return useMutation<LapsResult, Error, string>({
    mutationFn: async (deviceKey: string) => {
      try {
        const credential = await apiRequest<LapsCredential>(`/api/laps/${deviceKey}`);
        return { success: true, credential };
      } catch (error) {
        return {
          success: false,
          credential: null,
          message: error instanceof Error ? error.message : "Failed to retrieve LAPS password."
        };
      }
    }
  });
}
