import nextEnv from "@next/env";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

// Writes only to the linked project's production environment, without printing secrets.
nextEnv.loadEnvConfig(process.cwd());
const databaseUrl = process.env.TURSO_DATABASE_URL;
const databaseToken = process.env.TURSO_AUTH_TOKEN;
if (!databaseUrl?.startsWith("libsql://") || !databaseToken) throw new Error("A remote Turso URL and token are required in the local environment.");

const values = [
  ["TURSO_DATABASE_URL", databaseUrl],
  ["TURSO_AUTH_TOKEN", databaseToken],
  ["BETTER_AUTH_SECRET", randomBytes(48).toString("base64url")],
  ["SALARY_CLIENT_IP_HEADER", "x-real-ip"],
];
const childEnv = { ...process.env };
for (const key of ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN", "BETTER_AUTH_SECRET", "RESEND_API_KEY", "VERCEL_OIDC_TOKEN"]) delete childEnv[key];

function add(name, value) {
  return new Promise((resolve, reject) => {
    const args = ["--yes", "vercel@latest", "env", "add", name, "--environment", "production", "--sensitive", "--yes"];
    const program = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npx";
    const programArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npx.cmd", ...args] : args;
    const child = spawn(program, programArgs, { env: childEnv, stdio: ["pipe", "ignore", "ignore"] });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`Could not add ${name}; Vercel CLI exit code ${code}. Existing variables are never overwritten.`)));
    child.stdin.on("error", () => {});
    child.stdin.end(value);
  });
}
for (const [name, value] of values) {
  await add(name, value);
  console.log(`${name}: configured for production`);
}
