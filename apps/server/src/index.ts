import { networkInterfaces } from "node:os";

import { createApp } from "./app";
import { AUTH_MODE, APP_SLUG, isUniversal } from "./lib/universal-auth";
import { startMetricsSampler } from "./services/metrics-sampler";

function getLocalIp(): string | undefined {
  const interfaces = Object.values(networkInterfaces());
  for (const addrs of interfaces) {
    const addresses = addrs ?? [];
    for (const addr of addresses) {
      if (addr.family === "IPv4" && !addr.internal) return addr.address;
    }
  }
  return undefined;
}

createApp().listen(
  { port: Number(process.env["PORT"] ?? 3001), hostname: "0.0.0.0" },
  ({ port }) => {
    const localIp = getLocalIp();
    console.log(`  Local:   http://localhost:${port}`);
    if (localIp) console.log(`  Network: http://${localIp}:${port}`);
    console.log(
      isUniversal
        ? `  Auth:    UNIVERSAL — identity delegated to ${process.env["UNIVERSAL_AUTH_URL"] ?? "http://localhost:9000"} (app "${APP_SLUG}"). Log in with your Universal Admin credentials.`
        : `  Auth:    LOCAL — using this server's own accounts (AUTH_MODE=${AUTH_MODE}).`,
    );
    startMetricsSampler();
  },
);
