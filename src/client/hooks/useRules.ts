import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RuleDefinition } from "../lib/types.js";
import { apiRequest } from "../lib/api.js";

export type RuleInputPayload = Omit<RuleDefinition, "id" | "createdAt" | "updatedAt">;

export function useRules() {
  return useQuery({
    queryKey: ["rules"],
    queryFn: () => apiRequest<RuleDefinition[]>("/api/rules")
  });
}

export function useRuleMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["rules"] });
    void queryClient.invalidateQueries({ queryKey: ["devices"] });
    void queryClient.invalidateQueries({ queryKey: ["device"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return {
    create: useMutation({
      mutationFn: (input: RuleInputPayload) =>
        apiRequest<RuleDefinition>("/api/rules", {
          method: "POST",
          body: JSON.stringify(input)
        }),
      onSuccess: invalidate
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<RuleInputPayload> }) =>
        apiRequest<RuleDefinition>(`/api/rules/${id}`, {
          method: "PUT",
          body: JSON.stringify(input)
        }),
      onSuccess: invalidate
    }),
    remove: useMutation({
      mutationFn: (id: string) =>
        apiRequest<void>(`/api/rules/${id}`, { method: "DELETE" }),
      onSuccess: invalidate
    })
  };
}
