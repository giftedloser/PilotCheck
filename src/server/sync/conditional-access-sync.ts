import type { ConditionalAccessPolicyRow } from "../db/types.js";
import { GraphClient } from "./graph-client.js";

interface GraphConditionalAccessPolicyResponse {
  id: string;
  displayName?: string;
  state?: string;
  conditions?: unknown;
  grantControls?: unknown;
  sessionControls?: unknown;
}

export interface ConditionalAccessSyncResult {
  policies: ConditionalAccessPolicyRow[];
}

export async function syncConditionalAccessPolicies(
  client: GraphClient
): Promise<ConditionalAccessSyncResult> {
  const now = new Date().toISOString();

  const rawPolicies = await client.getAllPages<GraphConditionalAccessPolicyResponse>(
    "/identity/conditionalAccess/policies?$select=id,displayName,state,conditions,grantControls,sessionControls"
  );

  const policies: ConditionalAccessPolicyRow[] = rawPolicies.map((p) => ({
    id: p.id,
    display_name: p.displayName ?? "Unknown Policy",
    state: p.state ?? null,
    conditions_json: p.conditions ? JSON.stringify(p.conditions) : null,
    grant_controls_json: p.grantControls ? JSON.stringify(p.grantControls) : null,
    session_controls_json: p.sessionControls ? JSON.stringify(p.sessionControls) : null,
    last_synced_at: now,
    raw_json: JSON.stringify(p)
  }));

  return { policies };
}
