import { requestWithDelegatedToken } from "../auth/delegated-auth.js";

export interface LapsCredential {
  accountName: string;
  password: string;
  backupDateTime: string | null;
  passwordExpirationDateTime: string | null;
}

interface GraphLapsResponse {
  id: string;
  deviceName: string;
  credentials: Array<{
    accountName: string;
    accountSid: string;
    passwordBase64: string;
    backupDateTime: string;
    passwordExpirationDateTime: string | null;
  }>;
}

export async function getLapsPassword(
  token: string,
  entraDeviceId: string
): Promise<{ success: boolean; status: number; credential: LapsCredential | null; message: string }> {
  const { status, data } = await requestWithDelegatedToken<GraphLapsResponse>(
    token,
    `/deviceLocalCredentials/${entraDeviceId}?$select=credentials`
  );

  if (status !== 200 || !data?.credentials?.length) {
    return {
      success: false,
      status,
      credential: null,
      message:
        status === 404
          ? "No LAPS credential found for this device."
          : `Failed to retrieve LAPS password (status ${status}).`
    };
  }

  const cred = data.credentials[0]!;
  // Graph returns password as base64 — decode to UTF-8
  const password = Buffer.from(cred.passwordBase64, "base64").toString("utf-8");

  return {
    success: true,
    status,
    credential: {
      accountName: cred.accountName,
      password,
      backupDateTime: cred.backupDateTime ?? null,
      passwordExpirationDateTime: cred.passwordExpirationDateTime ?? null
    },
    message: "LAPS credential retrieved."
  };
}
