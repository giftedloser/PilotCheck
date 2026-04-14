import { useMutation } from "@tanstack/react-query";

import { apiRequest } from "../lib/api.js";

export interface BitLockerKey {
  id: string;
  createdDateTime: string | null;
  volumeType: string | null;
  key: string;
}

export interface BitLockerResult {
  success: boolean;
  keys: BitLockerKey[];
  message?: string;
}

export function useBitlocker() {
  return useMutation<BitLockerResult, Error, string>({
    mutationFn: async (deviceKey: string) => {
      try {
        const keys = await apiRequest<BitLockerKey[]>(`/api/bitlocker/${deviceKey}`);
        return { success: true, keys };
      } catch (error) {
        return {
          success: false,
          keys: [],
          message: error instanceof Error ? error.message : "Failed to retrieve BitLocker keys."
        };
      }
    }
  });
}
