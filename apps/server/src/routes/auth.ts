import { jwt } from "@elysia/jwt";
import { hash, verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { database } from "../db";
import { refreshTokens, users } from "../db/schema";

const JWT_SECRET = process.env["JWT_SECRET"];
if (!JWT_SECRET) throw new Error("JWT_SECRET is required");

const JWT_REFRESH_SECRET = process.env["JWT_REFRESH_SECRET"];
if (!JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET is required");

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const jwtAccess = new Elysia({ name: "jwt-access" }).use(
  jwt({ name: "jwtAccess", secret: JWT_SECRET }),
);

const jwtRefresh = new Elysia({ name: "jwt-refresh" }).use(
  jwt({ name: "jwtRefresh", secret: JWT_REFRESH_SECRET }),
);

async function hashToken(token: string): Promise<string> {
  return Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
  ).toString("hex");
}

async function persistRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  const [stored] = await database
    .insert(refreshTokens)
    .values({ userId, tokenHash, expiresAt })
    .returning({ id: refreshTokens.id });
  if (!stored) throw new Error("Failed to store refresh token");
}

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .use(jwtAccess)
  .use(jwtRefresh)
  .post(
    "/register",
    async ({ body, jwtAccess: accessJwt, jwtRefresh: refreshJwt, set }) => {
      const existing = await database
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (existing.length > 0) {
        set.status = 409;
        return { message: "Email already registered" };
      }

      const passwordHash = await hash(body.password);
      const [user] = await database
        .insert(users)
        .values({ email: body.email, passwordHash })
        .returning({
          id: users.id,
          email: users.email,
          createdAt: users.createdAt,
        });

      if (!user) {
        set.status = 500;
        return { message: "Failed to create user" };
      }

      const exp = Math.floor(Date.now() / 1000);
      const accessToken = await accessJwt.sign({
        sub: user.id,
        email: user.email,
        exp: exp + ACCESS_TOKEN_TTL_SECONDS,
      });
      const refreshToken = await refreshJwt.sign({
        sub: user.id,
        exp: exp + REFRESH_TOKEN_TTL_SECONDS,
      });
      await persistRefreshToken(user.id, refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
        accessToken,
        refreshToken,
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
      }),
      detail: { summary: "Register a new user" },
    },
  )
  .post(
    "/login",
    async ({ body, jwtAccess: accessJwt, jwtRefresh: refreshJwt, set }) => {
      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (!user) {
        set.status = 401;
        return { message: "Invalid email or password" };
      }

      const isValid = await verify(user.passwordHash, body.password);
      if (!isValid) {
        set.status = 401;
        return { message: "Invalid email or password" };
      }

      const exp = Math.floor(Date.now() / 1000);
      const accessToken = await accessJwt.sign({
        sub: user.id,
        email: user.email,
        exp: exp + ACCESS_TOKEN_TTL_SECONDS,
      });
      const refreshToken = await refreshJwt.sign({
        sub: user.id,
        exp: exp + REFRESH_TOKEN_TTL_SECONDS,
      });
      await persistRefreshToken(user.id, refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
        accessToken,
        refreshToken,
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
      detail: { summary: "Login and receive tokens" },
    },
  )
  .post(
    "/refresh",
    async ({ body, jwtRefresh: refreshJwt, jwtAccess: accessJwt, set }) => {
      const payload = await refreshJwt.verify(body.refreshToken);
      if (!payload) {
        set.status = 401;
        return { message: "Invalid or expired refresh token" };
      }

      const tokenHash = await hashToken(body.refreshToken);

      const [stored] = await database
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);

      if (!stored || stored.expiresAt < new Date()) {
        set.status = 401;
        return { message: "Refresh token not found or expired" };
      }

      const [user] = await database
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, stored.userId))
        .limit(1);

      if (!user) {
        set.status = 401;
        return { message: "User not found" };
      }

      const accessToken = await accessJwt.sign({
        sub: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
      });

      return { accessToken };
    },
    {
      body: t.Object({ refreshToken: t.String() }),
      detail: { summary: "Refresh access token" },
    },
  );
