import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");

const client = postgres(databaseUrl, { max: 1 });
const database = drizzle(client);

await migrate(database, {
  migrationsFolder: new URL("migrations", import.meta.url).pathname,
});
console.log("Migrations applied successfully");
await client.end();
