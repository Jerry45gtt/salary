import { mkdtemp, readFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { backupLocal } from "./backup-local.mjs";

const folder = await mkdtemp(join(tmpdir(), "salary-backup-test-"));
const source = join(folder, "source.db"), snapshot = join(folder, "snapshot.db"), restored = join(folder, "restored.db");
try {
  const db = new DatabaseSync(source);
  try {
    for (const file of ["001_initial.sql", "002_currency_lock.sql", "003_rate_limit.sql"]) db.exec(await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
    db.prepare("INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES(?,?,?,?,?,?)").run("test-user", "Test", "backup-test@example.com", 0, 1, 1);
    const category = db.prepare("SELECT id FROM categories WHERE user_id='test-user' AND type='expense' LIMIT 1").get();
    db.prepare("INSERT INTO transactions(id,user_id,category_id,type,amount_minor,date,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").run("test-transaction", "test-user", String(category.id), "expense", 12345, "2026-01-01", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
  } finally { db.close(); }
  await backupLocal(source, snapshot);
  await backupLocal(snapshot, restored);
  const check = new DatabaseSync(restored, { readOnly: true });
  try {
    const transaction = check.prepare("SELECT amount_minor FROM transactions WHERE id=?").get("test-transaction");
    const lock = check.prepare("SELECT user_id FROM currency_locks WHERE user_id=?").get("test-user");
    if (transaction?.amount_minor !== 12345 || !lock) throw new Error("Restored data is incomplete.");
  } finally { check.close(); }
  let rejected = false;
  try { await backupLocal(source, snapshot); } catch (error) { if (error.code === "EEXIST") rejected = true; else throw error; }
  if (!rejected) throw new Error("Existing backup was overwritten.");
  console.log("Synthetic local backup and restore, integrity and overwrite protection passed.");
} finally {
  for (const file of [source, snapshot, restored]) await unlink(file).catch((error) => { if (error.code !== "ENOENT") throw error; });
  await rmdir(folder);
}
