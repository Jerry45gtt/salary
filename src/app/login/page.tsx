import { AuthForm } from "@/components/auth-form";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  return <AuthForm mode="login" registered={(await searchParams).registered === "1"} />;
}
