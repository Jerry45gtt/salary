import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { currentMonth, monthPeriod, isDate, getReport } from "@/lib/report";

export const dynamic = "force-dynamic";
const money = (value: number, currency: string) => `${(value / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requireUser(), params = await searchParams;
  const current = currentMonth();
  const [year, month] = current.from.split("-").map(Number);
  const previous = monthPeriod(year, month - 2);
  const from = typeof params.from === "string" ? params.from : current.from;
  const to = typeof params.to === "string" ? params.to : current.to;
  const limit = isDate(from) ? new Date(`${from}T00:00:00Z`) : null;
  if (limit) limit.setUTCFullYear(limit.getUTCFullYear() + 100);
  const valid = isDate(from) && isDate(to) && from <= to && limit !== null && Date.parse(`${to}T00:00:00Z`) <= limit.getTime();
  const report = valid ? await getReport(user.id, from, to) : null;
  const highest = report ? Math.max(1, ...report.series.flatMap((v) => [v.income, v.expense])) : 1;
  return <section className="page"><div className="page-heading dashboard-heading"><div><span className="eyebrow">ЛИЧНЫЕ ФИНАНСЫ</span><h1>Обзор</h1><p>Доходы, расходы и результат за выбранный период.</p></div><Link href="/transactions" className="button">Добавить операцию</Link></div>
    <form className="panel filters" method="get"><label>С<input type="date" name="from" defaultValue={from} required /></label><label>По<input type="date" name="to" defaultValue={to} required /></label><button>Показать</button><Link href={`/dashboard?from=${current.from}&to=${current.to}`}>Текущий месяц</Link><Link href={`/dashboard?from=${previous.from}&to=${previous.to}`}>Прошлый месяц</Link></form>
    {!report ? <p role="alert" className="filter-error">Выберите корректный период не длиннее 100 лет.</p> : <><div className="summary-grid"><div className="panel metric"><p>Доходы</p><strong className="amount-income">{money(report.income, report.currency)}</strong></div><div className="panel metric"><p>Расходы</p><strong className="amount-expense">{money(report.expense, report.currency)}</strong></div><div className="panel metric"><p>Результат периода</p><strong>{money(report.income - report.expense, report.currency)}</strong><p>Доходы минус расходы</p></div></div>
    <div className="charts-grid"><section className="panel"><h2>Динамика</h2><p>{report.daily ? "По дням" : "По месяцам"} · доходы и расходы</p><div className="chart-legend"><span><i className="dot income" /> Доходы</span><span><i className="dot expense" /> Расходы</span></div>{report.income === 0 && report.expense === 0 ? <p className="empty">За этот период операций нет.</p> : <div className="timeline" aria-hidden="true">{report.series.map((row) => <div className="timeline-row" key={row.label}><span>{row.label}</span><div className="timeline-bars"><div className="timeline-income" style={{ width: `${row.income / highest * 100}%` }} /><div className="timeline-expense" style={{ width: `${row.expense / highest * 100}%` }} /></div></div>)}</div>}<details className="chart-table"><summary>Показать данные графика</summary><div className="table-wrap"><table><thead><tr><th>Период</th><th>Доходы</th><th>Расходы</th></tr></thead><tbody>{report.series.map((row) => <tr key={row.label}><th scope="row">{row.label}</th><td>{money(row.income, report.currency)}</td><td>{money(row.expense, report.currency)}</td></tr>)}</tbody></table></div></details></section>
    <section className="panel"><h2>Расходы по категориям</h2><p>Доля от общих расходов за период</p>{report.expense === 0 ? <p className="empty">За этот период расходов нет.</p> : <ul className="breakdown">{report.categories.map((category) => <li key={category.id}><div className="breakdown-header"><strong>{category.name}{category.archived ? " (архив)" : ""}</strong><span>{money(category.amount, report.currency)} · {(category.amount / report.expense * 100).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%</span></div><div className="breakdown-track" aria-hidden="true"><div style={{ width: `${category.amount / report.expense * 100}%` }} /></div></li>)}</ul>}</section></div></>}
  </section>;
}
