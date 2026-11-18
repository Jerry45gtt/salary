import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { SignOut } from "@/components/sign-out";
import { Navigation } from "@/components/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className="app-shell"><aside className="sidebar"><Link href="/dashboard" className="brand">SALARY</Link><p className="sidebar-caption">ЛИЧНЫЕ ФИНАНСЫ</p><Navigation /><div className="account"><span>{user.email}</span><SignOut /></div></aside><div className="app-content">{children}</div><Navigation mobile /></div>;
}
