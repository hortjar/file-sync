import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { users } from "./schema";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");

const client = postgres(databaseUrl, { max: 1 });
const database = drizzle(client);

const SEEDS = [{ email: "admin@email.com", password: "password" }];

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
