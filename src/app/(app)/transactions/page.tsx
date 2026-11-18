import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { client } from "@/lib/db";
import { Transactions } from "@/components/transactions";

export const dynamic = "force-dynamic";
type Params = { from?: string; to?: string; type?: string; category?: string; cursorDate?: string; cursorId?: string };
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser();
  const raw = await searchParams;
  const from = typeof raw.from === "string" ? raw.from : "", to = typeof raw.to === "string" ? raw.to : "", type = typeof raw.type === "string" ? raw.type : "", category = typeof raw.category === "string" ? raw.category : "", cursorDate = typeof raw.cursorDate === "string" ? raw.cursorDate : "", cursorId = typeof raw.cursorId === "string" ? raw.cursorId : "";
  const invalid = (from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to) || (type && !["income", "expense"].includes(type)) || category.length > 100 || Boolean(cursorDate) !== Boolean(cursorId) || (cursorDate && !validDate(cursorDate)) || cursorId.length > 100;
  const [categoryResult, profileResult] = await Promise.all([
    client.execute({ sql: "SELECT id,name,type,archived_at FROM categories WHERE user_id=? ORDER BY name", args: [user.id] }),
    client.execute({ sql: "SELECT currency FROM profiles WHERE user_id=?", args: [user.id] }),
  ]);
  const categories = categoryResult.rows.map((row) => ({ id: String(row.id), name: String(row.name), type: String(row.type), archived: row.archived_at !== null }));
  const args: string[] = [user.id];
  let where = "t.user_id=?";
  if (from) { where += " AND t.date>=?"; args.push(from); }
  if (to) { where += " AND t.date<=?"; args.push(to); }
  if (type) { where += " AND t.type=?"; args.push(type); }
  if (category) { where += " AND t.category_id=?"; args.push(category); }
  if (cursorDate && cursorId) { where += " AND (t.date<? OR (t.date=? AND t.id<?))"; args.push(cursorDate, cursorDate, cursorId); }
  const rows = invalid ? [] : (await client.execute({ sql: `SELECT t.id,t.type,t.amount_minor,t.date,t.comment,t.category_id,c.name AS category_name FROM transactions t JOIN categories c ON c.id=t.category_id AND c.user_id=t.user_id WHERE ${where} ORDER BY t.date DESC,t.id DESC LIMIT 51`, args })).rows;
  const transactions = rows.slice(0, 50).map((row) => ({ id: String(row.id), type: String(row.type), amountMinor: Number(row.amount_minor), date: String(row.date), comment: row.comment === null ? "" : String(row.comment), categoryId: String(row.category_id), categoryName: String(row.category_name) }));
  const last = transactions.at(-1);
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ from, to, type, category })) if (value) next.set(key, value);
  const firstPage = next.toString();
  if (last) { next.set("cursorDate", last.date); next.set("cursorId", last.id); }
  return <section className="page"><div className="page-heading"><span className="eyebrow">УЧЁТ</span><h1>Операции</h1><p>Записывайте доходы и расходы.</p></div><form className="panel filters" method="get"><label>С<input type="date" name="from" defaultValue={from} /></label><label>По<input type="date" name="to" defaultValue={to} /></label><label>Тип<select name="type" defaultValue={type}><option value="">Все</option><option value="income">Доходы</option><option value="expense">Расходы</option></select></label><label>Категория<select name="category" defaultValue={category}><option value="">Все</option>{categories.map((c) => <option value={c.id} key={c.id}>{c.name}{c.archived ? " (архив)" : ""}</option>)}</select></label><button>Применить</button><Link href="/transactions">Сбросить</Link></form>{invalid ? <p role="alert" className="filter-error">Проверьте даты и параметры фильтра.</p> : <Transactions categories={categories} transactions={transactions} currency={String(profileResult.rows[0]?.currency ?? "UZS")} filtered={Boolean(from || to || type || category || cursorDate)} />}{!invalid && rows.length > 50 && <div className="pagination"><Link className="button" href={`/transactions?${next.toString()}`}>Следующие 50</Link></div>}{!invalid && cursorDate && <p className="pagination"><Link href={firstPage ? `/transactions?${firstPage}` : "/transactions"}>К началу списка</Link></p>}</section>;
}
