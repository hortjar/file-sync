import { jwt } from "@elysia/jwt";
import { eq } from "drizzle-orm";
import { Elysia } from "elysia";

import { database } from "../db";
import { users } from "../db/schema";
import { isUniversal, provisionLocalUser, verifyUniversalToken } from "../lib/universal-auth";

type JwtPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

// In universal mode a local JWT secret isn't required — access tokens are
// verified against the Universal Admin server's JWKS instead.
const jwtSecret = process.env["JWT_SECRET"] ?? "unused-in-universal-mode";
if (!isUniversal && !process.env["JWT_SECRET"]) {
  throw new Error("JWT_SECRET environment variable is required");
}

export const jwtPlugin = new Elysia({ name: "jwt" }).use(jwt({ name: "jwt", secret: jwtSecret }));

const APP_SLUG = process.env["UNIVERSAL_AUTH_APP"] ?? "file-sync";

export const authPlugin = new Elysia({ name: "auth" })
  .use(jwtPlugin)
  .derive({ as: "global" }, async ({ jwt: jwtInstance, headers }) => {
    const emptyUser = {
      userId: undefined as string | undefined,
      userEmail: undefined as string | undefined,
      // Per-app grants from the Universal Admin server (universal mode only).
      userRoles: [] as string[],
      userPermissions: [] as string[],
      userIsAdmin: false,
    };

    const authorization = headers["authorization"];
    if (!authorization?.startsWith("Bearer ")) return emptyUser;

    const token = authorization.slice(7);

    // ─── Universal mode: verify against the shared server + JIT-provision ──────
    // Keeps every downstream route working: they still receive a local user id.
    if (isUniversal) {
      const claims = await verifyUniversalToken(token);
      if (!claims) return emptyUser;
      const local = await provisionLocalUser(claims);
      const grant = claims.apps?.find((a) => a.app === APP_SLUG);
      const roles = grant?.roles ?? [];
      return {
        userId: local.id,
        userEmail: local.email,
        userRoles: roles,
        userPermissions: grant?.permissions ?? [],
        userIsAdmin:
          roles.includes("admin") || claims.role === "admin" || claims.role === "superadmin",
      };
    }

    // ─── Local mode: original behaviour ────────────────────────────────────────
    const payload = await jwtInstance.verify(token);
    if (!payload) return emptyUser;

    const typedPayload = payload as unknown as JwtPayload;
    const [user] = await database
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, typedPayload.sub))
      .limit(1);

    if (!user) return emptyUser;

    return { ...emptyUser, userId: user.id, userEmail: user.email };
  })
  .macro({
    requireAuth: () => ({
      beforeHandle({ userId, set }) {
        if (userId) return;
        set.status = 401;
        return { message: "Unauthorized" };
      },
    }),
    // Require a specific per-app permission (from the Universal Admin grants).
    // Local mode has no per-app permission model, so this only enforces auth;
    // in universal mode admins bypass and everyone else needs the grant.
    requirePermission: (permission: string) => ({
      beforeHandle({ userId, userIsAdmin, userPermissions, set }) {
        if (!userId) {
          set.status = 401;
          return { message: "Unauthorized" };
        }
        if (isUniversal && !userIsAdmin && !userPermissions.includes(permission)) {
          set.status = 403;
          return { message: `You lack the required permission: ${permission}` };
        }
        return;
      },
    }),
  });
