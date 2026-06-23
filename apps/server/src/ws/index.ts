import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import { database } from "../db";
import { users } from "../db/schema";
import { logger } from "../lib/logger";
import { jwtPlugin } from "../middleware/auth";

import { registerConnection, removeConnectionByWsId } from "./connections";

type JwtPayload = { sub: string };

export const wsRoutes = new Elysia().use(jwtPlugin).ws("/ws", {
  query: t.Object({
    token: t.String(),
    deviceId: t.String(),
  }),
  open: async (ws) => {
    const payload = await ws.data.jwt.verify(ws.data.query.token);
    if (!payload) {
      ws.close(4001, "Unauthorized");
      return;
    }

    const typedPayload = payload as unknown as JwtPayload;
    const [user] = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, typedPayload.sub))
      .limit(1);

    if (!user) {
      ws.close(4001, "User not found");
      return;
    }

    registerConnection(ws.id, user.id, ws.data.query.deviceId, {
      send: (message) => ws.send(message),
    });

    logger.info({ userId: user.id, deviceId: ws.data.query.deviceId }, "WS client connected");
  },
  message: (ws, received) => {
    const raw = typeof received === "string" ? received : JSON.stringify(received);
    let parsed: { type?: string } | undefined;
    try {
      parsed = JSON.parse(raw) as { type?: string };
    } catch {
      return;
    }
    if (parsed?.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
    }
  },
  close: (ws) => {
    removeConnectionByWsId(ws.id);
  },
});
