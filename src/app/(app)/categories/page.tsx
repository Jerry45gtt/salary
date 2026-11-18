import { requireUser } from "@/lib/current-user";
import { client } from "@/lib/db";
import { Categories } from "@/components/categories";

export const dynamic = "force-dynamic";
export default async function CategoriesPage() {
  const user = await requireUser();
  const result = await client.execute({ sql: "SELECT id, type, name, archived_at FROM categories WHERE user_id = ? ORDER BY archived_at IS NOT NULL, type, name", args: [user.id] });
  const categories = result.rows.map((row) => ({ id: String(row.id), type: String(row.type), name: String(row.name), archived: row.archived_at !== null }));
  return <section className="page"><div className="page-heading"><div><span className="eyebrow">УЧЁТ</span><h1>Категории</h1><p>Управляйте категориями доходов и расходов.</p></div></div><Categories initialCategories={categories} /></section>;
}
