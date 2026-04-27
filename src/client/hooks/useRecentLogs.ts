import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "../lib/api.js";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  time: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

export function useRecentLogs(level: LogLevel | "all", limit = 200) {
  const params = new URLSearchParams();
  if (level !== "all") params.set("level", level);
  params.set("limit", String(limit));
  return useQuery({
    queryKey: ["recent-logs", level, limit] as const,
    queryFn: () => apiRequest<LogEntry[]>(`/api/health/logs?${params.toString()}`),
    refetchOnWindowFocus: false
  });
}
