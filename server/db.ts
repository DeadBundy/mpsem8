import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Only require DATABASE_URL if we're actually using the database
let pool: InstanceType<typeof Pool> | null = null;
let db: any = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
} else {
  console.log("No DATABASE_URL provided, using in-memory storage");
}

export { pool, db };
