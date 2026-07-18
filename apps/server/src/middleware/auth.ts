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

export const authPlugin = new Elysia({ name: "auth" })
  .use(jwtPlugin)
  .derive({ as: "global" }, async ({ jwt: jwtInstance, headers }) => {
    const emptyUser = {
      userId: undefined as string | undefined,
      userEmail: undefined as string | undefined,
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
      return { userId: local.id, userEmail: local.email };
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

    return { userId: user.id, userEmail: user.email };
  })
  .macro({
    requireAuth: () => ({
      beforeHandle({ userId, set }) {
        if (userId) return;
        set.status = 401;
        return { message: "Unauthorized" };
      },
    }),
  });
