import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");

const client = postgres(databaseUrl, { max: 10 });

export const database = drizzle(client, { schema });

export type Database = typeof database;
