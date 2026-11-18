import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const url = process.env.TURSO_DATABASE_URL;
if (url && url !== "file:local.db") {
  throw new Error("These tests require the default local.db configuration and a server restarted with that same configuration. Refusing to run against configured Turso or another database.");
}
