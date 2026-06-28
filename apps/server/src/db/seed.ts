import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { users } from "./schema";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");

const client = postgres(databaseUrl, { max: 1 });
const database = drizzle(client);

// The default admin account is configurable so deployments can set their own
// credentials via the environment (see ADMIN_EMAIL / ADMIN_PASSWORD in compose).
const adminEmail = process.env["ADMIN_EMAIL"] ?? "admin@email.com";
const adminPassword = process.env["ADMIN_PASSWORD"] ?? "password";

const SEEDS = [{ email: adminEmail, password: adminPassword }];

for (const seed of SEEDS) {
  const passwordHash = await hash(seed.password);
  await database
    .insert(users)
    .values({ email: seed.email, passwordHash })
    .onConflictDoNothing({ target: users.email });
  console.log(`Seeded user: ${seed.email}`);
}

await client.end();
console.log("Seed complete");
