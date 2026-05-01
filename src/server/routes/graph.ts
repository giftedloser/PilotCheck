import { Router } from "express";

import {
  getDelegatedToken,
  requireDelegatedAuth
} from "../auth/auth-middleware.js";
import { requestWithDelegatedToken } from "../auth/delegated-auth.js";
import { logger } from "../logger.js";

interface GraphUsersResponse {
  value?: Array<{
    id?: string;
    displayName?: string | null;
    userPrincipalName?: string | null;
    mail?: string | null;
  }>;
}

function escapeODataString(value: string) {
  return value.replaceAll("'", "''");
}

function usersSearchPath(query: string) {
  const escaped = escapeODataString(query);
  const filter = [
    `startswith(displayName,'${escaped}')`,
    `startswith(userPrincipalName,'${escaped}')`,
    `startswith(mail,'${escaped}')`
  ].join(" or ");
  const params = new URLSearchParams({
    "$select": "id,displayName,userPrincipalName,mail",
    "$filter": filter,
    "$top": "25"
  });
  return `/users?${params.toString()}`;
}

export function graphRouter() {
  const router = Router();

  router.get("/users", requireDelegatedAuth, async (request, response) => {
    const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
    if (query.length < 2 || query.length > 100) {
      response.status(400).json({ message: "Search query must be 2-100 characters." });
      return;
    }

    try {
      const token = getDelegatedToken(request);
      const result = await requestWithDelegatedToken<GraphUsersResponse>(
        token,
        usersSearchPath(query)
      );

      if (result.status >= 400) {
        logger.warn({ status: result.status }, "Graph user search failed.");
        response.status(result.status).json({
          message: "Could not search Microsoft Graph users. Check admin permissions and try again."
        });
        return;
      }

      const users = (result.data?.value ?? [])
        .filter((user) => typeof user.id === "string" && user.id.length > 0)
        .slice(0, 25)
        .map((user) => ({
          id: user.id as string,
          displayName: user.displayName ?? null,
          userPrincipalName: user.userPrincipalName ?? null,
          mail: user.mail ?? null
        }));

      response.json(users);
    } catch (error) {
      logger.warn(
        { err: error instanceof Error ? { name: error.name, message: error.message } : undefined },
        "Graph user search failed."
      );
      response.status(502).json({
        message: "Could not search Microsoft Graph users. Check admin permissions and try again."
      });
    }
  });

  return router;
}
