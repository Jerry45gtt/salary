import Link from "next/link";
export default function Home() {
  return (
    <main>
      <div className="card">
        <span className="brand">SALARY</span>
        <h1>Ваш финансовый аналитик</h1>
        <p>Доходы, расходы и финансовая аналитика в одном месте.</p>
        <div className="actions"><Link className="button" href="/login">Войти</Link><Link href="/register">Создать аккаунт</Link></div>
      </div>
    </main>
  );
}
