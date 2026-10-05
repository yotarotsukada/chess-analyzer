import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./client";

const here = path.dirname(fileURLToPath(import.meta.url));
await migrate(db, { migrationsFolder: path.join(here, "migrations") });
await pool.end();
console.log("migrations applied");
