import { ConfidentialClientApplication, type AuthorizationUrlRequest } from "@azure/msal-node";

import { config } from "../config.js";

const SCOPES = [
  "DeviceLocalCredential.Read.All",
  "DeviceManagementManagedDevices.ReadWrite.All",
  "DeviceManagementManagedDevices.PrivilegedOperations.All",
  "BitLockerKey.Read.All"
];

let msalInstance: ConfidentialClientApplication | null = null;

function getMsal(): ConfidentialClientApplication {
  if (msalInstance) return msalInstance;
  if (!config.isGraphConfigured) {
    throw new Error("Graph credentials are not configured.");
  }
  msalInstance = new ConfidentialClientApplication({
    auth: {
      clientId: config.AZURE_CLIENT_ID!,
      clientSecret: config.AZURE_CLIENT_SECRET!,
      authority: `https://login.microsoftonline.com/${config.AZURE_TENANT_ID}`
    }
  });
  return msalInstance;
}

export async function getAuthUrl(state?: string): Promise<string> {
  const msal = getMsal();
  const request: AuthorizationUrlRequest = {
    scopes: SCOPES,
    redirectUri: config.AZURE_REDIRECT_URI,
    state: state ?? "login"
  };
  return msal.getAuthCodeUrl(request);
}

export async function acquireDelegatedToken(code: string): Promise<{
  accessToken: string;
  account: { username: string; name?: string };
  expiresOn: Date;
}> {
  const msal = getMsal();
  const result = await msal.acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: config.AZURE_REDIRECT_URI
  });
  if (!result?.accessToken) {
    throw new Error("Failed to acquire delegated token.");
  }
  return {
    accessToken: result.accessToken,
    account: {
      username: result.account?.username ?? "unknown",
      name: result.account?.name ?? undefined
    },
    expiresOn: result.expiresOn ?? new Date(Date.now() + 3600 * 1000)
  };
}

export async function requestWithDelegatedToken<T>(
  accessToken: string,
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<{ status: number; data: T | null }> {
  const url = path.startsWith("http")
    ? path
    : `https://graph.microsoft.com/v1.0${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json"
  };
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    if (response.status === 204) {
      return { status: 204, data: null };
    }

    const data = response.ok ? ((await response.json()) as T) : null;
    return { status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
}
