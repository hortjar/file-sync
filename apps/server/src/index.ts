import { networkInterfaces } from "node:os";

import { createApp } from "./app";
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
    startMetricsSampler();
  },
);
