import nextEnv from "@next/env";
import { createClient } from "@libsql/client";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.TURSO_DATABASE_URL, token = process.env.TURSO_AUTH_TOKEN;
if (!url || !token || !/^libsql:\/\//i.test(url)) {
  console.error("Set a remote libsql:// TURSO_DATABASE_URL and TURSO_AUTH_TOKEN first.");
  process.exitCode = 1;
} else {
  let client;
  try {
    client = createClient({ url, authToken: token });
    const result = await client.execute({ sql: "SELECT name FROM sqlite_master WHERE type=? ORDER BY name", args: ["table"] });
    const names = result.rows.map((row) => String(row.name));
    const expected = ["user", "session", "account", "verification", "profiles", "categories", "transactions", "currency_locks", "rate_limit"];
    console.log("Turso connection: OK");
    console.log(`Required tables: ${expected.filter((name) => names.includes(name)).length}/${expected.length}`);
    console.log(`Other tables present: ${names.filter((name) => !expected.includes(name) && !name.startsWith("sqlite_")).length}`);
  } catch (error) {
    console.error(`Turso connection failed (${error.code || error.cause?.code || error.name}).`);
    process.exitCode = 1;
  } finally { client?.close(); }
}
