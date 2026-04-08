import { useQuery } from "@tanstack/react-query";

import type { ProfileAuditDetail, ProfileAuditSummary } from "../lib/types.js";
import { apiRequest } from "../lib/api.js";

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: () => apiRequest<ProfileAuditSummary[]>("/api/profiles")
  });
}

export function useProfileDetail(profileId: string | undefined) {
  return useQuery({
    queryKey: ["profile", profileId],
    queryFn: () => apiRequest<ProfileAuditDetail>(`/api/profiles/${profileId}`),
    enabled: Boolean(profileId)
  });
}
