import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "../env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __pool?: pg.Pool };

export const pool = globalForDb.__pool ?? new pg.Pool({ connectionString: env.databaseUrl, max: 5 });
globalForDb.__pool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;
