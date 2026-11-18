"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [{ href: "/dashboard", label: "Обзор" }, { href: "/transactions", label: "Операции" }, { href: "/categories", label: "Категории" }, { href: "/settings", label: "Настройки" }];
export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav className={mobile ? "mobile-nav" : undefined} aria-label="Основная навигация">{links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}</nav>;
}
