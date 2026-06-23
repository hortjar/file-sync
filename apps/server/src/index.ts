import { networkInterfaces } from "node:os";

import { createApp } from "./app";

function getLocalIp(): string | undefined {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
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
  },
);
