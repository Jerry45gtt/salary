import { ResetForm } from "@/components/reset-form";
export const dynamic = "force-dynamic";
export default function ForgotPassword() { return <ResetForm mode="request" enabled={Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)} />; }
