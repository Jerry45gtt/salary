import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL || "file:local.db";
if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN)) {
  throw new Error("Production requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.");
}
export const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
export const db = drizzle(client, { schema });
