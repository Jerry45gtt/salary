import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salary — финансовый аналитик",
  description: "Личный учёт доходов и расходов",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = (await cookies()).get("salary-theme")?.value === "dark" ? "dark" : "light";
  return <html lang="ru" data-theme={theme}><body>{children}</body></html>;
}
