import { DatabaseSync, backup } from "node:sqlite";
import { open, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// SQLite-only: this does not connect to or export remote Turso databases.
export async function backupLocal(sourcePath, destinationPath) {
  const source = resolve(sourcePath), destination = resolve(destinationPath);
  if (source === destination) throw new Error("Source and destination must be different files.");
  const db = new DatabaseSync(source, { readOnly: true });
  let reserved = false;
  try {
    const result = db.prepare("PRAGMA integrity_check").get();
    if (Object.values(result)[0] !== "ok") throw new Error("Source database integrity check failed.");
    const file = await open(destination, "wx", 0o600);
    reserved = true;
    await file.close();
    await backup(db, destination);
    const check = new DatabaseSync(destination, { readOnly: true });
    try { if (Object.values(check.prepare("PRAGMA integrity_check").get())[0] !== "ok") throw new Error("Backup integrity check failed."); }
    finally { check.close(); }
    reserved = false;
  } finally {
    db.close();
    if (reserved) await unlink(destination).catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 4) { console.error("Usage: node scripts/backup-local.mjs <existing-local-db> <new-output-db>"); process.exitCode = 1; }
  else {
    try { await backupLocal(process.argv[2], process.argv[3]); console.log("Local SQLite copy created and checked."); }
    catch (error) { console.error(`Backup failed: ${error.message}`); process.exitCode = 1; }
  }
}
