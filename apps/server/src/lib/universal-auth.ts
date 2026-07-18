/**
 * Universal auth integration.
 *
 * When AUTH_MODE=universal this app delegates identity to the shared
 * Universal Admin server instead of its own JWT logic:
 *   - Access tokens are verified locally against the server's JWKS (no
 *     per-request round trip), scoped to this app's audience.
 *   - login / register / refresh / logout are proxied to the universal server.
 *   - Verified users are just-in-time provisioned into the local `users` table
 *     so every existing route (devices, sync folders, …) that references a
 *     local user id keeps working unchanged.
 *
 * When AUTH_MODE=local (the default) none of this runs and the app behaves
 * exactly as before.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq } from "drizzle-orm";

import { database } from "../db";
import { users } from "../db/schema";

export const AUTH_MODE = process.env["AUTH_MODE"] === "universal" ? "universal" : "local";
export const APP_SLUG = process.env["UNIVERSAL_AUTH_APP"] ?? "file-sync";
const UNIVERSAL_URL = process.env["UNIVERSAL_AUTH_URL"] ?? "http://localhost:9200";
const ISSUER = process.env["UNIVERSAL_AUTH_ISSUER"] ?? UNIVERSAL_URL;

export const isUniversal = AUTH_MODE === "universal";

const jwks = createRemoteJWKSet(new URL(`${UNIVERSAL_URL}/.well-known/jwks.json`));

export interface UniversalClaims {
  sub: string;
  email: string;
  role: string;
  apps: { app: string; roles: string[]; permissions: string[] }[];
}

/** Verify a universal access token for this app's audience. Returns null if invalid. */
export async function verifyUniversalToken(token: string): Promise<UniversalClaims | null> {
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: ISSUER, audience: APP_SLUG });
    return payload as unknown as UniversalClaims;
  } catch {
    return null;
  }
}

/**
 * Map a universal identity onto a local user row (create on first sight).
 * Downstream tables key off the local id, so this keeps every FK intact.
 */
export async function provisionLocalUser(claims: UniversalClaims): Promise<{ id: string; email: string }> {
  const email = claims.email.toLowerCase();
  const [existing] = await database
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) return existing;

  // Password is never used in universal mode — store an unusable placeholder.
  const [created] = await database
    .insert(users)
    .values({ email, passwordHash: `universal:${claims.sub}` })
    .returning({ id: users.id, email: users.email });
  if (!created) throw new Error("Failed to provision universal user");
  return created;
}

/** Proxy an auth request (login/register/refresh/logout) to the universal server. */
export async function delegateAuth(
  path: "login" | "register" | "refresh" | "logout",
  body: Record<string, unknown>,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${UNIVERSAL_URL}/api/auth/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, app: APP_SLUG }),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

/**
 * Cross-subdomain SSO cookie (pattern B).
 *
 * After delegating auth, this backend re-issues the refresh token as an
 * HttpOnly cookie scoped to COOKIE_DOMAIN (e.g. ".hortjar.cz"). Because the
 * cookie lives on the parent domain, a browser session created here is visible
 * to every sibling app — so the user logs in once. The app's own JSON contract
 * is unchanged, so non-browser clients (e.g. the desktop app) are unaffected.
 */
export const cookieConfig = {
  enabled: isUniversal && process.env["ENABLE_AUTH_COOKIES"] !== "false",
  domain: process.env["COOKIE_DOMAIN"] || undefined,
  name: process.env["COOKIE_REFRESH_NAME"] ?? "ua_refresh",
  secure:
    (process.env["COOKIE_SECURE"] ?? (process.env["NODE_ENV"] === "production" ? "true" : "false")) !==
    "false",
  sameSite: (process.env["COOKIE_SAMESITE"] ?? "lax") as "lax" | "strict" | "none",
  maxAge: Number(process.env["REFRESH_TOKEN_TTL"] ?? 60 * 60 * 24 * 30),
};

// Loose shape of one Elysia cookie cell — avoids importing the full generic.
type CookieCell = {
  value?: unknown;
  set: (o: {
    value: string;
    httpOnly?: boolean | undefined;
    secure?: boolean | undefined;
    sameSite?: "lax" | "strict" | "none" | undefined;
    domain?: string | undefined;
    path?: string | undefined;
    maxAge?: number | undefined;
  }) => unknown;
};
export type CookieJar = Record<string, CookieCell | undefined>;

/** Set the shared refresh cookie from a delegated auth response. */
export function setSharedCookieFromResponse(cookie: CookieJar, data: unknown): void {
  if (!cookieConfig.enabled) return;
  const token = (data as { refreshToken?: unknown })?.refreshToken;
  if (typeof token !== "string" || !token) return;
  cookie[cookieConfig.name]?.set({
    value: token,
    httpOnly: true,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    domain: cookieConfig.domain,
    path: "/",
    maxAge: cookieConfig.maxAge,
  });
}

/** Read the refresh token from the shared cookie. */
export function readSharedCookie(cookie: CookieJar): string | undefined {
  const v = cookie[cookieConfig.name]?.value;
  return typeof v === "string" && v ? v : undefined;
}

/** Clear the shared refresh cookie (logout). */
export function clearSharedCookie(cookie: CookieJar): void {
  if (!cookieConfig.enabled) return;
  cookie[cookieConfig.name]?.set({
    value: "",
    httpOnly: true,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    domain: cookieConfig.domain,
    path: "/",
    maxAge: 0,
  });
}
