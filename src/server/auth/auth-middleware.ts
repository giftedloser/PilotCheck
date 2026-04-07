import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    delegatedToken?: string;
    delegatedUser?: string;
    delegatedName?: string;
    delegatedExpiresAt?: string;
  }
}

export function requireDelegatedAuth(request: Request, response: Response, next: NextFunction) {
  const session = request.session;
  if (!session.delegatedToken) {
    response.status(401).json({ message: "Admin login required for this action." });
    return;
  }
  if (session.delegatedExpiresAt && new Date(session.delegatedExpiresAt) < new Date()) {
    session.delegatedToken = undefined;
    session.delegatedUser = undefined;
    response.status(401).json({ message: "Session expired. Please log in again." });
    return;
  }
  next();
}

export function getDelegatedToken(request: Request): string {
  return request.session.delegatedToken!;
}

export function getDelegatedUser(request: Request): string {
  return request.session.delegatedUser ?? "unknown";
}
