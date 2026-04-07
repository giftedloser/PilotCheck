import { Router } from "express";

import { config } from "../config.js";
import { getAuthUrl, acquireDelegatedToken } from "../auth/delegated-auth.js";

export function authRouter() {
  const router = Router();

  // GET /api/auth/status — check if admin is logged in
  router.get("/status", (request, response) => {
    const session = request.session;
    const isAuthenticated =
      Boolean(session.delegatedToken) &&
      (!session.delegatedExpiresAt || new Date(session.delegatedExpiresAt) > new Date());

    response.json({
      authenticated: isAuthenticated,
      user: isAuthenticated ? session.delegatedUser : null,
      name: isAuthenticated ? session.delegatedName : null,
      expiresAt: isAuthenticated ? session.delegatedExpiresAt : null
    });
  });

  // GET /api/auth/login — redirect to Microsoft login
  router.get("/login", async (_request, response) => {
    try {
      const url = await getAuthUrl();
      response.json({ loginUrl: url });
    } catch (error) {
      response.status(500).json({
        message: error instanceof Error ? error.message : "Failed to generate login URL."
      });
    }
  });

  // GET /api/auth/callback — handle Microsoft redirect
  router.get("/callback", async (request, response) => {
    const code = request.query.code as string | undefined;
    if (!code) {
      response.status(400).send("Missing authorization code.");
      return;
    }

    try {
      const result = await acquireDelegatedToken(code);
      request.session.delegatedToken = result.accessToken;
      request.session.delegatedUser = result.account.username;
      request.session.delegatedName = result.account.name;
      request.session.delegatedExpiresAt = result.expiresOn.toISOString();

      // Redirect back to the client app
      response.redirect(`http://localhost:${config.CLIENT_PORT}/`);
    } catch (error) {
      response.status(500).send(
        `Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  });

  // POST /api/auth/logout — clear session
  router.post("/logout", (request, response) => {
    request.session.destroy(() => {
      response.json({ authenticated: false });
    });
  });

  return router;
}
