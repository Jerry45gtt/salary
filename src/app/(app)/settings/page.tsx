import { requireUser } from "@/lib/current-user";
import { client } from "@/lib/db";
import { CurrencySettings } from "@/components/currency-settings";
import { SignOut } from "@/components/sign-out";
import { ThemeSettings } from "@/components/theme-settings";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const user = await requireUser();
  const result = await client.execute({ sql: "SELECT currency, EXISTS(SELECT 1 FROM currency_locks WHERE user_id=?) AS locked FROM profiles WHERE user_id=?", args: [user.id, user.id] });
  if (!result.rows[0]) throw new Error("Profile missing");
  const theme = (await cookies()).get("salary-theme")?.value === "dark" ? "dark" : "light";
  return <section className="page"><div className="page-heading"><span className="eyebrow">АККАУНТ</span><h1>Настройки</h1><p>Параметры вашего финансового учёта.</p></div><CurrencySettings currency={String(result.rows[0].currency)} locked={Number(result.rows[0].locked) === 1} /><ThemeSettings initialTheme={theme} /><div className="settings-signout"><SignOut /></div></section>;
}
