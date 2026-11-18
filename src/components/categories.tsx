"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; type: string; archived: boolean };
export function Categories({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function change(payload: object) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error || "Не удалось сохранить изменения."); return false; }
      router.refresh(); return true;
    } catch { setMessage("Не удалось подключиться. Попробуйте ещё раз."); return false; }
    finally { setBusy(false); }
  }
  return <div className="category-layout"><div className="panel"><h2>Новая категория</h2><p>Выберите тип и укажите название.</p><form className="form" onSubmit={async (e) => { e.preventDefault(); if (await change({ operation: "create", name, type })) { setName(""); setMessage("Категория добавлена."); } }}><label>Тип<select value={type} onChange={(e) => setType(e.target.value)}><option value="expense">Расход</option><option value="income">Доход</option></select></label><label>Название<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="Например, Продукты" /></label><button disabled={busy}>Добавить категорию</button></form><p className="feedback" role="status">{message}</p></div><div className="category-groups">{(["expense", "income"] as const).map((group) => <section className="panel" key={group}><div className="panel-heading"><div><span className={group === "income" ? "dot income" : "dot expense"} /><h2>{group === "income" ? "Доходы" : "Расходы"}</h2></div><span className="count">{initialCategories.filter((category) => category.type === group && !category.archived).length}</span></div><ul className="category-list">{initialCategories.filter((category) => category.type === group && !category.archived).map((category) => <li key={category.id}>{editing === category.id ? <form className="edit-category" onSubmit={async (e) => { e.preventDefault(); if (await change({ operation: "rename", id: category.id, name: editName })) { setEditing(null); setMessage("Название изменено."); } }}><label className="sr-only" htmlFor={`edit-${category.id}`}>Новое название</label><input id={`edit-${category.id}`} value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={60} required /><button disabled={busy}>Сохранить</button><button type="button" className="subtle" onClick={() => setEditing(null)}>Отмена</button></form> : <><span>{category.name}</span><div className="row-actions"><button className="subtle" disabled={busy} onClick={() => { setEditing(category.id); setEditName(category.name); }}>Изменить</button><button className="subtle" disabled={busy} onClick={async () => { if (window.confirm(`Архивировать категорию «${category.name}»? История операций сохранится.`) && await change({ operation: "archive", id: category.id })) setMessage("Категория архивирована."); }}>В архив</button></div></>}</li>)}</ul>{!initialCategories.some((category) => category.type === group && !category.archived) && <p className="empty">Категорий пока нет. Добавьте первую.</p>}</section>)}{initialCategories.some((category) => category.archived) && <section className="panel"><h2>Архив</h2><p>Архивные категории сохраняются в истории операций.</p><ul className="archived-list">{initialCategories.filter((category) => category.archived).map((category) => <li key={category.id}>{category.name} <span>· {category.type === "income" ? "доход" : "расход"}</span></li>)}</ul></section>}</div></div>;
}
