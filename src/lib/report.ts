import "server-only";
import { client } from "./db";

const DAY = 86400000;
export function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function currentMonth(timeZone = "Asia/Tashkent") {
  const now = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).format(new Date());
  const [year, month] = now.split("-").map(Number);
  return monthPeriod(year, month - 1);
}
export function monthPeriod(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}
export async function getReport(userId: string, from: string, to: string) {
  const days = Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY) + 1;
  const daily = days <= 62;
  const bucket = daily ? "t.date" : "substr(t.date,1,7)";
  const [grouped, categories, profile] = await Promise.all([
    client.execute({ sql: `SELECT ${bucket} AS bucket,t.type,SUM(t.amount_minor) AS amount FROM transactions t WHERE t.user_id=? AND t.date>=? AND t.date<=? GROUP BY ${bucket},t.type ORDER BY bucket`, args: [userId, from, to] }),
    client.execute({ sql: "SELECT c.id,c.name,c.archived_at,SUM(t.amount_minor) AS amount FROM transactions t JOIN categories c ON c.id=t.category_id AND c.user_id=t.user_id WHERE t.user_id=? AND t.type='expense' AND t.date>=? AND t.date<=? GROUP BY c.id,c.name,c.archived_at ORDER BY amount DESC,c.name", args: [userId, from, to] }),
    client.execute({ sql: "SELECT currency FROM profiles WHERE user_id=?", args: [userId] }),
  ]);
  const values = new Map<string, { income: number; expense: number }>();
  for (const row of grouped.rows) {
    const key = String(row.bucket), entry = values.get(key) ?? { income: 0, expense: 0 };
    if (row.type === "income") entry.income = Number(row.amount); else entry.expense = Number(row.amount);
    values.set(key, entry);
  }
  const series: { label: string; income: number; expense: number }[] = [];
  const cursor = new Date(`${from}T00:00:00Z`), end = new Date(`${to}T00:00:00Z`);
  if (!daily) cursor.setUTCDate(1);
  while (cursor <= end) {
    const label = cursor.toISOString().slice(0, daily ? 10 : 7);
    series.push({ label, ...(values.get(label) ?? { income: 0, expense: 0 }) });
    if (daily) cursor.setUTCDate(cursor.getUTCDate() + 1); else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const income = series.reduce((sum, row) => sum + row.income, 0), expense = series.reduce((sum, row) => sum + row.expense, 0);
  return { currency: String(profile.rows[0]?.currency ?? "UZS"), income, expense, daily, series, categories: categories.rows.map((row) => ({ id: String(row.id), name: String(row.name), archived: row.archived_at !== null, amount: Number(row.amount) })) };
}
