import { hash } from "@node-rs/argon2";
import { sql } from "drizzle-orm";
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

// Seeding is a one-time bootstrap, not something to run on every launch. The
// deploy command invokes this on each container start, so we bail out as soon as
// any user exists. This means the default admin is created only on a fresh
// database and never resurrected after it (or after real users) have been added.
const rows = await database.select({ count: sql<number>`count(*)::int` }).from(users);
const userCount = rows[0]?.count ?? 0;

if (userCount > 0) {
  console.log(`Seed skipped: ${userCount} user(s) already present`);
} else {
  const passwordHash = await hash(adminPassword);
  await database
    .insert(users)
    .values({ email: adminEmail, passwordHash })
    .onConflictDoNothing({ target: users.email });
  console.log(`Seeded user: ${adminEmail}`);
}

await client.end();
console.log("Seed complete");
