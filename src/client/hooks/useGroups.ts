import { useQuery } from "@tanstack/react-query";

import type { GroupDetail, GroupSummary } from "../lib/types.js";
import { apiRequest } from "../lib/api.js";

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: () => apiRequest<GroupSummary[]>("/api/groups")
  });
}

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: () => apiRequest<GroupDetail>(`/api/groups/${groupId}`),
    enabled: Boolean(groupId)
  });
}
